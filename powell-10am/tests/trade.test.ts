import { describe, expect, test } from "bun:test";
import { simulate } from "../src/trade.js";
import { makeConfig } from "../src/spec.js";
import type { Setup } from "../src/model.js";
import type { Candle, Po3Read } from "../src/types.js";

function c(time: number, open: number, high: number, low: number, close: number): Candle {
  return { time, open, high, low, close };
}

const emptyRead = { date: "2026-01-06" } as Po3Read;

function longSetup(overrides: Partial<Setup> = {}): Setup {
  return {
    date: "2026-01-06",
    direction: "long",
    entryPrice: 100,
    stopPrice: 99,
    targetPrice: 103,
    plannedR: 3,
    entryLabel: "FVG proximal",
    targetLabel: "prior day high",
    armedFromIndex: 1,
    entryCutoffIndex: 10,
    flattenIndex: 20,
    read: emptyRead,
    ...overrides,
  };
}

describe("fills", () => {
  test("a limit fills when price trades to it, not when a candle closes past it", () => {
    const candles = [
      c(0, 101, 101.5, 100.8, 101),
      c(1, 101, 101.2, 99.9, 100.5), // trades through 100
      c(2, 100.5, 103.5, 100.4, 103.2),
    ];
    const trade = simulate(candles, longSetup());
    expect(trade.outcome).toBe("target");
    expect(trade.entryTime).toBe(1);
  });

  test("does not fill before the order is armed", () => {
    // Price touches 100 on candle 0, but the order only works from index 1.
    const candles = [
      c(0, 101, 101.5, 99.5, 101),
      c(1, 101, 101.2, 100.6, 101),
      c(2, 101, 101.1, 100.9, 101),
    ];
    const trade = simulate(candles, longSetup({ entryCutoffIndex: 2, flattenIndex: 2 }));
    expect(trade.outcome).toBe("no-fill");
    expect(trade.r).toBe(0);
  });

  test("abandons the setup after the entry cutoff", () => {
    const candles = [
      c(0, 101, 101.5, 100.8, 101),
      c(1, 101, 101.2, 100.5, 101),
      c(2, 101, 101.2, 100.5, 101),
      c(3, 101, 101.2, 99.0, 99.5), // reaches the entry, but too late
    ];
    const trade = simulate(candles, longSetup({ entryCutoffIndex: 2, flattenIndex: 5 }));
    expect(trade.outcome).toBe("no-fill");
  });
});

describe("exits", () => {
  test("a stop hit is a full loss of one R", () => {
    const candles = [
      c(0, 101, 101.5, 100.8, 101),
      c(1, 101, 101.2, 99.9, 100.5),
      c(2, 100.5, 100.6, 98.5, 98.8),
    ];
    const trade = simulate(candles, longSetup());
    expect(trade.outcome).toBe("stop");
    expect(trade.r).toBeCloseTo(-1, 4);
  });

  // OHLC data cannot say which level a candle touched first. Assuming the
  // target would flatter every backtest ever run, so the loss is assumed.
  test("when one candle spans both stop and target, the loss is assumed", () => {
    const candles = [
      c(0, 101, 101.5, 100.8, 101),
      c(1, 101, 101.2, 99.9, 100.5),
      c(2, 100.5, 103.5, 98.5, 102), // both levels inside one bar
    ];
    const trade = simulate(candles, longSetup());
    expect(trade.outcome).toBe("stop");
    expect(trade.r).toBeCloseTo(-1, 4);
  });

  test("an unresolved position is marked to the close at the flatten time", () => {
    const candles = [
      c(0, 101, 101.5, 100.8, 101),
      c(1, 101, 101.2, 99.9, 100.5),
      c(2, 100.5, 101, 100.2, 100.5),
      c(3, 100.5, 100.8, 100.2, 100.5), // flatten here at 100.5 = +0.5R
    ];
    const trade = simulate(candles, longSetup({ flattenIndex: 3 }));
    expect(trade.outcome).toBe("timeout");
    expect(trade.r).toBeCloseTo(0.5, 4);
  });
});

describe("excursions", () => {
  test("records how far the trade ran in favour and against", () => {
    const candles = [
      c(0, 101, 101.5, 100.8, 101),
      c(1, 101, 101.2, 99.9, 100.5),
      c(2, 100.5, 102, 99.6, 101), // -0.4R worst
      c(3, 101, 103.5, 100.9, 103.2), // +3.5R best, on the bar that exits at +3R
    ];
    const trade = simulate(candles, longSetup());
    // MFE tracks the high of the exit bar, which overshoots the 103 target.
    expect(trade.maxFavourableR).toBeCloseTo(3.5, 1);
    expect(trade.maxAdverseR).toBeCloseTo(0.4, 1);
  });
});

describe("trade management", () => {
  test("a partial banks half the position at the configured R", () => {
    const config = makeConfig({ partialAtR: 1 });
    const candles = [
      c(0, 101, 101.5, 100.8, 101),
      c(1, 101, 101.2, 99.9, 100.5),
      c(2, 100.5, 101.2, 100.4, 101), // +1R touched, half banked
      c(3, 101, 101.1, 98.9, 99), // stop takes the rest
    ];
    const trade = simulate(candles, longSetup(), config);
    // +0.5R banked, then -0.5R on the remaining half.
    expect(trade.r).toBeCloseTo(0, 4);
  });

  test("a break-even stop converts a would-be loser into a scratch", () => {
    const config = makeConfig({ breakEvenAtR: 1 });
    const candles = [
      c(0, 101, 101.5, 100.8, 101),
      c(1, 101, 101.2, 99.9, 100.5),
      c(2, 100.5, 101.2, 100.4, 101), // +1R reached, stop moves to 100
      c(3, 101, 101.1, 99.5, 99.8), // hits 100, not the original 99
    ];
    const trade = simulate(candles, longSetup(), config);
    expect(trade.r).toBeCloseTo(0, 4);
  });
});

describe("shorts", () => {
  test("mirror the long logic", () => {
    const shortSetup = longSetup({
      direction: "short",
      entryPrice: 100,
      stopPrice: 101,
      targetPrice: 97,
    });
    const candles = [
      c(0, 99, 99.2, 98.8, 99),
      c(1, 99, 100.1, 98.9, 99.5), // trades up to the entry
      c(2, 99.5, 99.6, 96.5, 96.8), // runs to target
    ];
    const trade = simulate(candles, shortSetup);
    expect(trade.outcome).toBe("target");
    expect(trade.r).toBeCloseTo(3, 4);
  });
});
