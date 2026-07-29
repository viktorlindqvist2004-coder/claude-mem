import type { Candle, Swing } from "../types.js";

/**
 * Fractal swing points: a swing high is a candle whose high is strictly greater
 * than the `strength` highs on either side (and likewise for lows).
 *
 * Note that a swing is only confirmed `strength` candles after it prints. The
 * detector never uses a swing before its confirmation index, which is what
 * keeps the backtest honest — see `confirmedAt`.
 */
export function findSwings(candles: Candle[], strength = 2): Swing[] {
  const swings: Swing[] = [];
  if (strength < 1) throw new Error("Swing strength must be >= 1");

  for (let i = strength; i < candles.length - strength; i++) {
    const candle = candles[i];
    if (!candle) continue;

    let isHigh = true;
    let isLow = true;
    for (let offset = 1; offset <= strength; offset++) {
      const left = candles[i - offset];
      const right = candles[i + offset];
      if (!left || !right) {
        isHigh = false;
        isLow = false;
        break;
      }
      if (candle.high <= left.high || candle.high <= right.high) isHigh = false;
      if (candle.low >= left.low || candle.low >= right.low) isLow = false;
    }

    if (isHigh) swings.push({ index: i, time: candle.time, price: candle.high, kind: "high" });
    if (isLow) swings.push({ index: i, time: candle.time, price: candle.low, kind: "low" });
  }

  return swings;
}

/** The index at which a swing becomes knowable to a live trader. */
export function confirmedAt(swing: Swing, strength = 2): number {
  return swing.index + strength;
}
