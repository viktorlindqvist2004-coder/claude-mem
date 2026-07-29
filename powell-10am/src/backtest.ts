/**
 * Backtest and statistics.
 *
 * The numbers this produces are only as honest as the assumptions behind them,
 * so they are stated rather than buried:
 *
 *  - Results are in R (multiples of initial risk), never currency. R is
 *    position-size independent and therefore comparable across instruments.
 *  - Costs are modelled as a fixed R deduction per filled trade. Ignoring
 *    commission and slippage is how a marginal model is made to look good; the
 *    default is deliberately non-zero.
 *  - Days with no setup are counted and reported. A model that trades four days
 *    a year with a great hit rate is not a model, and hiding the denominator is
 *    how that gets missed.
 *  - Rejection reasons are tallied, so when the model stops trading you can see
 *    which condition is doing the filtering.
 */

import type { Candle, DayResult, Trade } from "./types.js";
import type { ModelConfig } from "./spec.js";
import { DEFAULT_CONFIG } from "./spec.js";
import { readDay } from "./model.js";
import { simulate } from "./trade.js";
import { groupByEtDate } from "./time.js";

export interface BacktestOptions {
  /** Cost per filled trade, in R. Covers commission and slippage. */
  costR?: number;
  /** Correlated series for the SMT filter. */
  correlated?: Candle[];
  /** Restrict to dates in `[from, to]`, inclusive, as ET `YYYY-MM-DD`. */
  from?: string;
  to?: string;
}

export interface Stats {
  days: number;
  setups: number;
  fills: number;
  wins: number;
  losses: number;
  scratches: number;
  noFills: number;
  winRate: number;
  /** Mean R per filled trade, after costs. */
  expectancy: number;
  totalR: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdownR: number;
  /** Longest run of consecutive losing trades. */
  maxLosingStreak: number;
  /** Mean planned reward:risk across setups. */
  averagePlannedR: number;
  /** Mean best excursion, in R — how much was left on the table. */
  averageMfe: number;
  /** Mean worst excursion, in R — how much heat was taken. */
  averageMae: number;
  /** Fraction of days that produced a setup at all. */
  setupRate: number;
  /** Why days were skipped, most common first. */
  rejections: { reason: string; count: number }[];
}

export interface BacktestResult {
  results: DayResult[];
  trades: Trade[];
  stats: Stats;
  config: ModelConfig;
}

export function backtest(
  candles: Candle[],
  config: ModelConfig = DEFAULT_CONFIG,
  options: BacktestOptions = {},
): BacktestResult {
  const costR = options.costR ?? 0.05;
  const byDate = groupByEtDate(candles);
  const dates = [...byDate.keys()]
    .sort()
    .filter((date) => (options.from ? date >= options.from : true))
    .filter((date) => (options.to ? date <= options.to : true));

  const results: DayResult[] = [];
  const trades: Trade[] = [];

  for (const date of dates) {
    const { read, setup } = readDay(candles, date, config, {
      ...(options.correlated ? { correlated: options.correlated } : {}),
    });

    if (!setup) {
      results.push({ date, read, trade: null, skipped: read.rejectedReason ?? "no setup" });
      continue;
    }

    const trade = simulate(candles, setup, config);
    if (trade.outcome !== "no-fill") {
      trade.r = round(trade.r - costR);
    }
    results.push({ date, read, trade });
    trades.push(trade);
  }

  return { results, trades, stats: summarise(results, trades), config };
}

export function summarise(results: DayResult[], trades: Trade[]): Stats {
  const filled = trades.filter((trade) => trade.outcome !== "no-fill");
  const wins = filled.filter((trade) => trade.r > 0);
  const losses = filled.filter((trade) => trade.r < 0);
  const scratches = filled.filter((trade) => trade.r === 0);

  const totalR = sum(filled.map((trade) => trade.r));
  const grossWin = sum(wins.map((trade) => trade.r));
  const grossLoss = Math.abs(sum(losses.map((trade) => trade.r)));

  const rejectionCounts = new Map<string, number>();
  for (const result of results) {
    if (result.trade) continue;
    const reason = result.skipped ?? "unknown";
    rejectionCounts.set(reason, (rejectionCounts.get(reason) ?? 0) + 1);
  }

  return {
    days: results.length,
    setups: trades.length,
    fills: filled.length,
    wins: wins.length,
    losses: losses.length,
    scratches: scratches.length,
    noFills: trades.length - filled.length,
    winRate: filled.length > 0 ? round(wins.length / filled.length) : 0,
    expectancy: filled.length > 0 ? round(totalR / filled.length) : 0,
    totalR: round(totalR),
    averageWin: wins.length > 0 ? round(grossWin / wins.length) : 0,
    averageLoss: losses.length > 0 ? round(-grossLoss / losses.length) : 0,
    profitFactor: grossLoss > 0 ? round(grossWin / grossLoss) : grossWin > 0 ? Infinity : 0,
    maxDrawdownR: round(maxDrawdown(filled.map((trade) => trade.r))),
    maxLosingStreak: maxStreak(filled.map((trade) => trade.r)),
    averagePlannedR: trades.length > 0 ? round(sum(trades.map((t) => t.plannedR)) / trades.length) : 0,
    averageMfe: filled.length > 0 ? round(sum(filled.map((t) => t.maxFavourableR)) / filled.length) : 0,
    averageMae: filled.length > 0 ? round(sum(filled.map((t) => t.maxAdverseR)) / filled.length) : 0,
    setupRate: results.length > 0 ? round(trades.length / results.length) : 0,
    rejections: [...rejectionCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Peak-to-trough decline of the cumulative R curve. */
function maxDrawdown(values: number[]): number {
  let peak = 0;
  let equity = 0;
  let worst = 0;
  for (const value of values) {
    equity += value;
    peak = Math.max(peak, equity);
    worst = Math.min(worst, equity - peak);
  }
  return Math.abs(worst);
}

function maxStreak(values: number[]): number {
  let current = 0;
  let longest = 0;
  for (const value of values) {
    if (value < 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}
