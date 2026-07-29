import type { Candle } from "../types.js";

/**
 * Wilder-style average true range over the `period` candles ending at `index`
 * (inclusive). Returns `null` when there is not enough history, so callers must
 * decide what to do rather than silently trading on a fabricated value.
 */
export function atrAt(candles: Candle[], index: number, period: number): number | null {
  if (period < 1) throw new Error("ATR period must be >= 1");
  if (index < period) return null;

  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    if (!current || !previous) return null;
    sum += trueRange(current, previous);
  }
  return sum / period;
}

export function trueRange(current: Candle, previous: Candle): number {
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close),
  );
}
