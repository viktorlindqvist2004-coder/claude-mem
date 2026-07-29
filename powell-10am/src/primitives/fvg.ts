import type { Candle, Direction, FVG } from "../types.js";

/**
 * Detect the fair value gap left by the candle at `index`.
 *
 * A bullish FVG exists when the low of candle `index + 1` sits above the high
 * of candle `index - 1`; the gap is that untouched band. Bearish is the mirror.
 * Because the gap is only complete once the *next* candle closes, this returns
 * null until `index + 1` exists — no peeking beyond that.
 */
export function fvgAt(candles: Candle[], index: number): FVG | null {
  const before = candles[index - 1];
  const middle = candles[index];
  const after = candles[index + 1];
  if (!before || !middle || !after) return null;

  if (after.low > before.high) {
    return makeFvg(index, middle.time, "long", after.low, before.high);
  }
  if (after.high < before.low) {
    return makeFvg(index, middle.time, "short", after.high, before.low);
  }
  return null;
}

/**
 * For a bullish gap price falls back into it from above, so the first edge it
 * meets (`proximal`) is the gap's top. For a bearish gap it is the bottom.
 */
function makeFvg(
  index: number,
  time: number,
  direction: Direction,
  nearEdge: number,
  farEdge: number,
): FVG {
  const top = Math.max(nearEdge, farEdge);
  const bottom = Math.min(nearEdge, farEdge);
  const proximal = direction === "long" ? top : bottom;
  const distal = direction === "long" ? bottom : top;
  return {
    index,
    time,
    direction,
    proximal,
    distal,
    ce: (top + bottom) / 2,
    size: top - bottom,
    inverted: false,
  };
}

/** All gaps formed in `[from, to]`, oldest first. */
export function findFvgs(candles: Candle[], from: number, to: number): FVG[] {
  const gaps: FVG[] = [];
  for (let i = Math.max(1, from); i <= Math.min(to, candles.length - 2); i++) {
    const gap = fvgAt(candles, i);
    if (gap) gaps.push(gap);
  }
  return gaps;
}

/**
 * A gap is "inverted" once price closes decisively through its far edge — the
 * band then acts as resistance instead of support, and vice versa. Returns the
 * inverted view of the gap, with proximal/distal and direction flipped.
 */
export function invert(gap: FVG): FVG {
  return {
    ...gap,
    direction: gap.direction === "long" ? "short" : "long",
    proximal: gap.distal,
    distal: gap.proximal,
    inverted: true,
  };
}

/** Index at which `gap` was invalidated by a close through its far edge, if any. */
export function inversionIndex(candles: Candle[], gap: FVG, searchTo: number): number | null {
  for (let i = gap.index + 2; i <= Math.min(searchTo, candles.length - 1); i++) {
    const candle = candles[i];
    if (!candle) continue;
    if (gap.direction === "long" && candle.close < gap.distal) return i;
    if (gap.direction === "short" && candle.close > gap.distal) return i;
  }
  return null;
}

/** True when the candle trades into the gap's band at all. */
export function touches(candle: Candle, gap: FVG): boolean {
  const top = Math.max(gap.proximal, gap.distal);
  const bottom = Math.min(gap.proximal, gap.distal);
  return candle.low <= top && candle.high >= bottom;
}
