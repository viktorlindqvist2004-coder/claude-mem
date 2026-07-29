import { describe, expect, test } from "bun:test";
import { defaultObjective, expand, gridSearch } from "../src/learn.js";
import { backtest, summarise } from "../src/backtest.js";
import { makeConfig } from "../src/spec.js";
import { bullishSetupDay } from "./helpers/series.js";
import type { Stats } from "../src/backtest.js";

describe("expand", () => {
  test("produces the cartesian product of the grid", () => {
    const combinations = expand({
      entryMode: ["fvg-proximal", "ote-sweet"],
      minPlannedR: [2, 3, 4],
    });
    expect(combinations).toHaveLength(6);
    expect(combinations).toContainEqual({ entryMode: "fvg-proximal", minPlannedR: 3 });
  });

  test("an empty grid yields a single default configuration", () => {
    expect(expand({})).toEqual([{}]);
  });

  test("ignores parameters with no candidate values", () => {
    expect(expand({ minPlannedR: [] })).toEqual([{}]);
  });
});

describe("defaultObjective", () => {
  function stats(overrides: Partial<Stats>): Stats {
    return {
      days: 100,
      setups: 50,
      fills: 50,
      wins: 25,
      losses: 25,
      scratches: 0,
      noFills: 0,
      winRate: 0.5,
      expectancy: 0.5,
      totalR: 25,
      averageWin: 2,
      averageLoss: -1,
      profitFactor: 2,
      maxDrawdownR: 5,
      maxLosingStreak: 4,
      averagePlannedR: 3,
      averageMfe: 2,
      averageMae: 1,
      setupRate: 0.5,
      rejections: [],
      ...overrides,
    };
  }

  test("rejects configurations that never traded", () => {
    expect(defaultObjective(stats({ fills: 0 }))).toBe(-Infinity);
  });

  // Without shrinkage a 3-trade fluke outranks a 200-trade edge, and every
  // search returns garbage that looks spectacular.
  test("shrinks the score of thin samples toward zero", () => {
    const thin = defaultObjective(stats({ fills: 3, expectancy: 2 }));
    const thick = defaultObjective(stats({ fills: 300, expectancy: 0.5 }));
    expect(thick).toBeGreaterThan(thin);
  });

  test("penalises drawdown", () => {
    const calm = defaultObjective(stats({ maxDrawdownR: 2 }));
    const violent = defaultObjective(stats({ maxDrawdownR: 40 }));
    expect(calm).toBeGreaterThan(violent);
  });
});

describe("gridSearch", () => {
  test("discards candidates below the minimum trade count", () => {
    // One scripted day can never produce 20 trades, so everything is filtered.
    const ranked = gridSearch(bullishSetupDay(), { entryMode: ["fvg-proximal", "ote-sweet"] }, {
      minTrades: 20,
    });
    expect(ranked).toHaveLength(0);
  });

  test("returns candidates ranked best first", () => {
    const ranked = gridSearch(
      bullishSetupDay(),
      { targetMode: ["std-dev"], entryMode: ["fvg-proximal", "ote-sweet"] },
      { minTrades: 1 },
    );
    expect(ranked.length).toBeGreaterThan(0);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score);
    }
  });
});

describe("backtest accounting", () => {
  const config = makeConfig({ targetMode: "std-dev", stdDevTarget: -2 });

  test("counts days without a setup and records why", () => {
    const result = backtest(bullishSetupDay(), config, { costR: 0 });
    expect(result.stats.days).toBeGreaterThan(1);
    // The prior session has no setup; its rejection reason must be recorded.
    expect(result.stats.rejections.length).toBeGreaterThan(0);
    expect(result.stats.setups).toBe(1);
  });

  test("deducts costs from every filled trade", () => {
    const free = backtest(bullishSetupDay(), config, { costR: 0 });
    const costly = backtest(bullishSetupDay(), config, { costR: 0.5 });
    expect(free.stats.totalR - costly.stats.totalR).toBeCloseTo(0.5 * free.stats.fills, 4);
  });

  test("summarise reports zeros rather than NaN for an empty run", () => {
    const stats = summarise([], []);
    expect(stats.expectancy).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.profitFactor).toBe(0);
  });
});
