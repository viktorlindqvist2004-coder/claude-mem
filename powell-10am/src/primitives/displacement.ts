/**
 * Displacement — the distribution leg.
 *
 * After the raid, the model needs proof that the reversal is real. Displacement
 * is that proof: a fast, bodied move that (a) is large relative to recent
 * range, (b) leaves a fair value gap behind, and (c) for this model, closes
 * back through the key open price. Condition (c) is what makes it the *10am*
 * model rather than a generic reversal model — the sweep happens on one side of
 * the key open and the trade is taken on the other.
 */

import type { Candle, Direction, Displacement } from "../types.js";
import { atrAt } from "./atr.js";
import { fvgAt } from "./fvg.js";

export interface DisplacementOptions {
  minAtrMultiple: number;
  atrPeriod: number;
  requireFvg: boolean;
  /** When set, the move must close through this price to qualify. */
  reclaimPrice: number | null;
  /** Allow the move to span up to this many consecutive candles. */
  maxCandles: number;
}

/**
 * First qualifying displacement in `[from, to]` travelling in `direction`.
 *
 * A displacement may be a single candle or a short run of same-direction
 * candles, because a genuine expansion leg is often two or three bars rather
 * than one outsized one. The FVG is taken from whichever candle in the run
 * actually left the gap.
 */
export function findDisplacement(
  candles: Candle[],
  direction: Direction,
  from: number,
  to: number,
  options: DisplacementOptions,
): Displacement | null {
  const end = Math.min(to, candles.length - 2);

  for (let start = Math.max(1, from); start <= end; start++) {
    const first = candles[start];
    if (!first) continue;
    if (!isWith(first, direction)) continue;

    const atr = atrAt(candles, start, options.atrPeriod);
    if (!atr || atr <= 0) continue;

    // Extend the run while candles keep pushing the same way.
    let last = start;
    for (let i = start + 1; i <= Math.min(start + options.maxCandles - 1, end); i++) {
      const candle = candles[i];
      if (!candle || !isWith(candle, direction)) break;
      last = i;
    }

    for (let stop = start; stop <= last; stop++) {
      const closing = candles[stop];
      if (!closing) continue;

      const magnitude =
        direction === "long" ? closing.close - first.open : first.open - closing.close;
      if (magnitude <= 0) continue;

      const atrMultiple = magnitude / atr;
      if (atrMultiple < options.minAtrMultiple) continue;

      if (options.reclaimPrice !== null) {
        const reclaimed =
          direction === "long"
            ? closing.close > options.reclaimPrice
            : closing.close < options.reclaimPrice;
        if (!reclaimed) continue;
      }

      const gap = firstGapInRun(candles, start, stop, direction);
      if (options.requireFvg && !gap) continue;

      return {
        startIndex: start,
        endIndex: stop,
        time: closing.time,
        direction,
        magnitude,
        atrMultiple,
        fvg: gap,
      };
    }
  }

  return null;
}

function isWith(candle: Candle, direction: Direction): boolean {
  return direction === "long" ? candle.close > candle.open : candle.close < candle.open;
}

function firstGapInRun(
  candles: Candle[],
  start: number,
  stop: number,
  direction: Direction,
) {
  for (let i = start; i <= stop; i++) {
    const gap = fvgAt(candles, i);
    if (gap && gap.direction === direction) return gap;
  }
  return null;
}
