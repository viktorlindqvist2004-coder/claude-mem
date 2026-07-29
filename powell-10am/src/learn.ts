/**
 * The learning layer.
 *
 * "Learns the strategy" is done here in the only way that means anything for a
 * trading model: search the parameter space, then measure the winner on data it
 * has never seen. A grid search alone does not learn, it memorises — with
 * enough combinations something always looks excellent in-sample.
 *
 * Three tools, in increasing order of trustworthiness:
 *
 *   gridSearch     Ranks every combination on one dataset. Fast, and the
 *                  results mean very little on their own.
 *   walkForward    Optimises on a rolling in-sample window and records the
 *                  out-of-sample result of that choice. This is the number to
 *                  believe, and it is normally much worse than the grid's best.
 *   ablate         Turns one rule off at a time to see which conditions are
 *                  actually carrying the model and which are decoration.
 *
 * The degradation figure `walkForward` reports — in-sample expectancy minus
 * out-of-sample — is the honest summary of how much of the grid's edge was
 * curve fit.
 */

import type { Candle } from "./types.js";
import type { ModelConfig } from "./spec.js";
import { DEFAULT_CONFIG, makeConfig } from "./spec.js";
import { backtest, type BacktestOptions, type Stats } from "./backtest.js";
import { groupByEtDate } from "./time.js";

/** Candidate values per parameter. Any subset of `ModelConfig` may be searched. */
export type ParameterGrid = {
  [K in keyof ModelConfig]?: ModelConfig[K][];
};

export interface Candidate {
  config: ModelConfig;
  /** Only the parameters that differ from the defaults, for readable output. */
  overrides: Partial<ModelConfig>;
  stats: Stats;
  score: number;
}

export interface SearchOptions extends BacktestOptions {
  /**
   * Ignore any combination producing fewer than this many filled trades. The
   * single most important guard in the whole module: a 3-trade sample with a
   * 100% hit rate is noise, and without this it wins every search.
   */
  minTrades?: number;
  /** How to rank. Defaults to expectancy penalised by drawdown. */
  objective?: (stats: Stats) => number;
}

/** Default objective: expectancy, penalised for drawdown and thin samples. */
export function defaultObjective(stats: Stats): number {
  if (stats.fills === 0) return -Infinity;
  const drawdownPenalty = 1 + stats.maxDrawdownR / 10;
  // Shrink toward zero when the sample is small — a 5-trade edge is not an edge.
  const confidence = stats.fills / (stats.fills + 20);
  return (stats.expectancy / drawdownPenalty) * confidence;
}

/** Every combination in the grid, ranked best first. */
export function gridSearch(
  candles: Candle[],
  grid: ParameterGrid,
  options: SearchOptions = {},
): Candidate[] {
  const minTrades = options.minTrades ?? 20;
  const objective = options.objective ?? defaultObjective;
  const combinations = expand(grid);

  const candidates: Candidate[] = [];
  for (const overrides of combinations) {
    const config = makeConfig(overrides);
    const result = backtest(candles, config, options);
    if (result.stats.fills < minTrades) continue;
    candidates.push({
      config,
      overrides,
      stats: result.stats,
      score: objective(result.stats),
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export interface WalkForwardFold {
  trainFrom: string;
  trainTo: string;
  testFrom: string;
  testTo: string;
  /** Parameters chosen on the training window. */
  chosen: Partial<ModelConfig>;
  inSample: Stats;
  outOfSample: Stats;
}

export interface WalkForwardResult {
  folds: WalkForwardFold[];
  /** Out-of-sample statistics pooled across every fold. */
  pooled: {
    trades: number;
    expectancy: number;
    totalR: number;
    winRate: number;
  };
  /** Mean in-sample expectancy minus mean out-of-sample expectancy. */
  degradation: number;
  /** Parameters chosen most often across folds — the stable ones. */
  stability: { parameter: string; value: string; folds: number }[];
}

export interface WalkForwardOptions extends SearchOptions {
  /** Number of folds. More folds means shorter, noisier test windows. */
  folds?: number;
  /** Fraction of each fold used for training. */
  trainFraction?: number;
}

/**
 * Rolling optimise-then-test.
 *
 * Dates are split into `folds` contiguous blocks; within each block the first
 * `trainFraction` is optimised over and the remainder is traded once, with the
 * chosen parameters frozen. Nothing from the test window influences the choice.
 */
export function walkForward(
  candles: Candle[],
  grid: ParameterGrid,
  options: WalkForwardOptions = {},
): WalkForwardResult {
  const foldCount = options.folds ?? 4;
  const trainFraction = options.trainFraction ?? 0.7;
  const objective = options.objective ?? defaultObjective;

  const dates = [...groupByEtDate(candles).keys()].sort();
  if (dates.length < foldCount * 5) {
    throw new Error(
      `Not enough trading days (${dates.length}) for ${foldCount} folds. Supply more data or reduce folds.`,
    );
  }

  const folds: WalkForwardFold[] = [];
  const blockSize = Math.floor(dates.length / foldCount);

  for (let f = 0; f < foldCount; f++) {
    const blockStart = f * blockSize;
    const blockEnd = f === foldCount - 1 ? dates.length : blockStart + blockSize;
    const splitAt = blockStart + Math.floor((blockEnd - blockStart) * trainFraction);
    if (splitAt <= blockStart || splitAt >= blockEnd) continue;

    const trainFrom = dates[blockStart] as string;
    const trainTo = dates[splitAt - 1] as string;
    const testFrom = dates[splitAt] as string;
    const testTo = dates[blockEnd - 1] as string;

    const ranked = gridSearch(candles, grid, {
      ...options,
      from: trainFrom,
      to: trainTo,
      // Training windows are short, so the trade floor has to scale down or
      // every candidate is filtered out and the fold silently disappears.
      minTrades: Math.max(3, Math.floor((options.minTrades ?? 20) / foldCount)),
      objective,
    });

    const best = ranked[0];
    if (!best) continue;

    const oos = backtest(candles, best.config, { ...options, from: testFrom, to: testTo });

    folds.push({
      trainFrom,
      trainTo,
      testFrom,
      testTo,
      chosen: best.overrides,
      inSample: best.stats,
      outOfSample: oos.stats,
    });
  }

  return {
    folds,
    pooled: pool(folds),
    degradation: round(
      mean(folds.map((fold) => fold.inSample.expectancy)) -
        mean(folds.map((fold) => fold.outOfSample.expectancy)),
    ),
    stability: stability(folds),
  };
}

export interface Ablation {
  rule: string;
  description: string;
  stats: Stats;
  /** Expectancy change versus the baseline. Negative means the rule helped. */
  delta: number;
}

/**
 * Turn each rule off in turn and measure what happens.
 *
 * A rule whose removal barely moves expectancy is not earning its complexity —
 * and a rule whose removal *improves* results is actively costing you money,
 * which is worth knowing before you spend six months trusting it.
 */
export function ablate(
  candles: Candle[],
  baseConfig: ModelConfig = DEFAULT_CONFIG,
  options: BacktestOptions = {},
): { baseline: Stats; ablations: Ablation[] } {
  const baseline = backtest(candles, baseConfig, options).stats;

  const variants: { rule: string; description: string; overrides: Partial<ModelConfig> }[] = [
    {
      rule: "requireCloseBackInside",
      description: "accept sweeps that close through the level",
      overrides: { requireCloseBackInside: false },
    },
    {
      rule: "requireFvg",
      description: "accept displacement that leaves no fair value gap",
      overrides: { requireFvg: false },
    },
    {
      rule: "requireKeyOpenReclaim",
      description: "drop the requirement to displace back through 10:00",
      overrides: { requireKeyOpenReclaim: false },
    },
    {
      rule: "minDisplacementAtr",
      description: "halve the displacement energy threshold",
      overrides: { minDisplacementAtr: baseConfig.minDisplacementAtr / 2 },
    },
    {
      rule: "minSweepPenetration",
      description: "accept one-tick grazes as sweeps",
      overrides: { minSweepPenetration: 0 },
    },
    {
      rule: "minPlannedR",
      description: "remove the reward:risk floor",
      overrides: { minPlannedR: 0 },
    },
    {
      rule: "minPoolWeight",
      description: "allow raids on insignificant pools",
      overrides: { minPoolWeight: 1 },
    },
    {
      rule: "manipulationEnd",
      description: "widen the manipulation window to 11:00",
      overrides: { manipulationEnd: "11:00" },
    },
  ];

  const ablations = variants.map((variant) => {
    const stats = backtest(candles, makeConfig({ ...baseConfig, ...variant.overrides }), options).stats;
    return {
      rule: variant.rule,
      description: variant.description,
      stats,
      delta: round(stats.expectancy - baseline.expectancy),
    };
  });

  return { baseline, ablations: ablations.sort((a, b) => a.delta - b.delta) };
}

// ---------------------------------------------------------------------

/** Cartesian product of the grid, as override objects. */
export function expand(grid: ParameterGrid): Partial<ModelConfig>[] {
  const keys = Object.keys(grid) as (keyof ModelConfig)[];
  let combinations: Partial<ModelConfig>[] = [{}];

  for (const key of keys) {
    const values = grid[key];
    if (!values || values.length === 0) continue;
    const next: Partial<ModelConfig>[] = [];
    for (const combination of combinations) {
      for (const value of values) {
        next.push({ ...combination, [key]: value });
      }
    }
    combinations = next;
  }

  return combinations;
}

function pool(folds: WalkForwardFold[]): WalkForwardResult["pooled"] {
  const trades = folds.reduce((total, fold) => total + fold.outOfSample.fills, 0);
  const totalR = folds.reduce((total, fold) => total + fold.outOfSample.totalR, 0);
  const wins = folds.reduce((total, fold) => total + fold.outOfSample.wins, 0);
  return {
    trades,
    totalR: round(totalR),
    expectancy: trades > 0 ? round(totalR / trades) : 0,
    winRate: trades > 0 ? round(wins / trades) : 0,
  };
}

/** How often each parameter value was selected — high counts mean a real signal. */
function stability(folds: WalkForwardFold[]): WalkForwardResult["stability"] {
  const counts = new Map<string, number>();
  for (const fold of folds) {
    for (const [parameter, value] of Object.entries(fold.chosen)) {
      const key = `${parameter}=${JSON.stringify(value)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [parameter = "", value = ""] = key.split("=");
      return { parameter, value, folds: count };
    })
    .sort((a, b) => b.folds - a.folds);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}
