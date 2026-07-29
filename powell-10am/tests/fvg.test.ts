import { describe, expect, test } from "bun:test";
import { findFvgs, fvgAt, inversionIndex, invert, touches } from "../src/primitives/fvg.js";
import type { Candle } from "../src/types.js";

function c(time: number, open: number, high: number, low: number, close: number): Candle {
  return { time, open, high, low, close };
}

describe("fvgAt", () => {
  test("detects a bullish gap when candle 3's low clears candle 1's high", () => {
    const candles = [
      c(1, 100, 101, 99, 100.5),
      c(2, 100.5, 105, 100.4, 104.8), // displacement
      c(3, 104.8, 106, 102, 105.5), // low 102 > high 101
    ];
    const gap = fvgAt(candles, 1);
    expect(gap).not.toBeNull();
    expect(gap?.direction).toBe("long");
    // Price falls back into a bullish gap from above, so the top edge is met first.
    expect(gap?.proximal).toBeCloseTo(102, 6);
    expect(gap?.distal).toBeCloseTo(101, 6);
    expect(gap?.ce).toBeCloseTo(101.5, 6);
    expect(gap?.size).toBeCloseTo(1, 6);
  });

  test("detects a bearish gap as the mirror image", () => {
    const candles = [
      c(1, 100, 101, 99, 99.5),
      c(2, 99.5, 99.6, 95, 95.2),
      c(3, 95.2, 98, 94, 94.5), // high 98 < low 99
    ];
    const gap = fvgAt(candles, 1);
    expect(gap?.direction).toBe("short");
    expect(gap?.proximal).toBeCloseTo(98, 6);
    expect(gap?.distal).toBeCloseTo(99, 6);
  });

  test("returns null when candles 1 and 3 overlap", () => {
    const candles = [c(1, 100, 102, 99, 101), c(2, 101, 103, 100, 102), c(3, 102, 104, 101, 103)];
    expect(fvgAt(candles, 1)).toBeNull();
  });

  test("returns null before the third candle exists — no peeking ahead", () => {
    const candles = [c(1, 100, 101, 99, 100.5), c(2, 100.5, 105, 100.4, 104.8)];
    expect(fvgAt(candles, 1)).toBeNull();
  });
});

describe("invert", () => {
  test("flips direction and swaps the edges", () => {
    const candles = [
      c(1, 100, 101, 99, 100.5),
      c(2, 100.5, 105, 100.4, 104.8),
      c(3, 104.8, 106, 102, 105.5),
    ];
    const gap = fvgAt(candles, 1);
    const inverted = invert(gap!);
    expect(inverted.direction).toBe("short");
    expect(inverted.proximal).toBeCloseTo(gap!.distal, 6);
    expect(inverted.inverted).toBe(true);
    // The midpoint is unchanged by inversion.
    expect(inverted.ce).toBeCloseTo(gap!.ce, 6);
  });
});

describe("inversionIndex", () => {
  test("reports where price closed through the far edge", () => {
    const candles = [
      c(1, 100, 101, 99, 100.5),
      c(2, 100.5, 105, 100.4, 104.8),
      c(3, 104.8, 106, 102, 105.5),
      c(4, 105.5, 105.6, 101.5, 102),
      c(5, 102, 102.2, 100, 100.5), // closes below the 101 distal edge
    ];
    const gap = fvgAt(candles, 1);
    expect(inversionIndex(candles, gap!, 4)).toBe(4);
  });

  test("returns null while the gap holds", () => {
    const candles = [
      c(1, 100, 101, 99, 100.5),
      c(2, 100.5, 105, 100.4, 104.8),
      c(3, 104.8, 106, 102, 105.5),
      c(4, 105.5, 106, 103, 104),
    ];
    const gap = fvgAt(candles, 1);
    expect(inversionIndex(candles, gap!, 3)).toBeNull();
  });
});

describe("touches", () => {
  test("is true when the candle trades into the band", () => {
    const gap = { proximal: 102, distal: 101, ce: 101.5 } as never as Parameters<typeof touches>[1];
    expect(touches(c(9, 103, 103.5, 101.8, 102.5), gap)).toBe(true);
    expect(touches(c(9, 104, 105, 103, 104.5), gap)).toBe(false);
  });
});

describe("findFvgs", () => {
  test("collects every gap in the window, oldest first", () => {
    const candles = [
      c(1, 100, 101, 99, 100.5),
      c(2, 100.5, 105, 100.4, 104.8),
      c(3, 104.8, 106, 102, 105.5),
      c(4, 105.5, 110, 105.4, 109.8),
      c(5, 109.8, 111, 107, 110),
    ];
    const gaps = findFvgs(candles, 1, 3);
    expect(gaps.length).toBeGreaterThanOrEqual(2);
    expect(gaps[0]!.index).toBeLessThan(gaps[1]!.index);
  });
});
