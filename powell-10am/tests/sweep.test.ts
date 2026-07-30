import { describe, expect, test } from "bun:test";
import { findSweep } from "../src/primitives/sweep.js";


describe("how long the reclaim may take", () => {
  /**
   * The behaviour this pins is the one the journal flagged: a raid that pushes
   * through, probes further, then reclaims is a raid — not expansion. With a
   * one-candle allowance the engine called four of eleven reviewed days
   * expansion for exactly this shape.
   */
  const pool = {
    kind: "opening-range-low" as const,
    side: "low" as const,
    price: 100,
    time: 0,
    weight: 5,
    label: "opening range low",
  };
  // push through and close below, probe deeper, then reclaim on the third bar.
  const candles = [
    { time: 1, open: 101, high: 101.5, low: 100.5, close: 101 },
    { time: 2, open: 101, high: 101, low: 97, close: 98 },
    { time: 3, open: 98, high: 99, low: 96, close: 97.5 },
    { time: 4, open: 97.5, high: 102, low: 100.5, close: 101.5 },
  ];
  const options = { minPenetration: 0.01, requireCloseBackInside: true, referenceRange: 10 };

  test("one bar is not enough — this reads as expansion", () => {
    expect(findSweep(candles, [pool], 0, 3, { ...options, reclaimBars: 1 })).toBeNull();
  });

  test("three bars finds it, and reports it at the reclaim, not the push", () => {
    const sweep = findSweep(candles, [pool], 0, 3, { ...options, reclaimBars: 3 });
    expect(sweep).not.toBeNull();
    // Known at bar 3, where the close came back above 100 — not at bar 1.
    expect(sweep!.index).toBe(3);
    // The extreme spans the whole excursion; the stop belongs beyond 96, not 97.
    expect(sweep!.extreme).toBe(96);
  });

  test("genuine expansion is still rejected however long the allowance", () => {
    const runaway = [
      candles[0]!,
      { time: 2, open: 101, high: 101, low: 97, close: 98 },
      { time: 3, open: 98, high: 98.5, low: 95, close: 95.5 },
      { time: 4, open: 95.5, high: 96, low: 93, close: 93.5 },
    ];
    expect(findSweep(runaway, [pool], 0, 3, { ...options, reclaimBars: 5 })).toBeNull();
  });

  test("the default stays honest when close-back-inside is off", () => {
    const sweep = findSweep(candles, [pool], 0, 3, { ...options, requireCloseBackInside: false });
    expect(sweep!.index).toBe(1);
  });
});
