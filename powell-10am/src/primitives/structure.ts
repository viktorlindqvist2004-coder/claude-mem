/**
 * Market structure: BOS, CHoCH and MSS.
 *
 * The distinction the 10am model actually depends on:
 *   BOS   — a swing broken in the direction of the prevailing leg. Continuation.
 *   CHoCH — the first counter-trend swing broken. A warning, not a signal.
 *   MSS   — a CHoCH broken *with displacement*, i.e. a fast bodied move that
 *           leaves a fair value gap behind. This is the confirmation the model
 *           trades; a CHoCH without displacement is noise.
 *
 * The model's sequence is always: sweep a pool → MSS back through the key open
 * → enter on the retracement. An MSS without a preceding sweep is a different
 * (and worse) trade.
 */

import type { Candle, Direction, Swing } from "../types.js";
import { atrAt } from "./atr.js";
import { fvgAt } from "./fvg.js";
import { findSwings } from "./swing.js";

export type StructureKind = "bos" | "choch" | "mss";

export interface StructureBreak {
  kind: StructureKind;
  direction: Direction;
  /** Candle that closed through the swing. */
  index: number;
  time: number;
  /** The swing level that was broken. */
  level: number;
  /** Displacement strength in ATR units at the break. */
  atrMultiple: number;
  /** Whether the breaking move left an imbalance. */
  hasFvg: boolean;
}

export interface StructureOptions {
  swingStrength: number;
  atrPeriod: number;
  /** Break must exceed this ATR multiple to qualify as an MSS. */
  minDisplacementAtr: number;
  /** MSS additionally requires a fair value gap. */
  requireFvg: boolean;
}

export const DEFAULT_STRUCTURE_OPTIONS: StructureOptions = {
  swingStrength: 2,
  atrPeriod: 14,
  minDisplacementAtr: 1.5,
  requireFvg: true,
};

/**
 * Find structure breaks in `[from, to]`.
 *
 * Only swings confirmed *before* the breaking candle are eligible, so this
 * never uses information a live trader would not have had.
 */
export function findStructureBreaks(
  candles: Candle[],
  from: number,
  to: number,
  options: Partial<StructureOptions> = {},
): StructureBreak[] {
  const opts = { ...DEFAULT_STRUCTURE_OPTIONS, ...options };
  const swings = findSwings(candles, opts.swingStrength);
  const breaks: StructureBreak[] = [];

  let lastDirection: Direction | null = null;

  for (let i = Math.max(1, from); i <= Math.min(to, candles.length - 1); i++) {
    const candle = candles[i];
    if (!candle) continue;

    const eligible = swings.filter((swing) => swing.index + opts.swingStrength < i);
    const priorHigh = lastOf(eligible.filter((s) => s.kind === "high"));
    const priorLow = lastOf(eligible.filter((s) => s.kind === "low"));

    const brokeHigh = priorHigh !== null && candle.close > priorHigh.price;
    const brokeLow = priorLow !== null && candle.close < priorLow.price;
    if (!brokeHigh && !brokeLow) continue;

    // If both broke on one candle, the larger excursion wins.
    let direction: Direction;
    let level: number;
    if (brokeHigh && brokeLow && priorHigh && priorLow) {
      const upDistance = candle.close - priorHigh.price;
      const downDistance = priorLow.price - candle.close;
      direction = upDistance >= downDistance ? "long" : "short";
      level = direction === "long" ? priorHigh.price : priorLow.price;
    } else if (brokeHigh && priorHigh) {
      direction = "long";
      level = priorHigh.price;
    } else if (priorLow) {
      direction = "short";
      level = priorLow.price;
    } else {
      continue;
    }

    const atr = atrAt(candles, i, opts.atrPeriod);
    const body = Math.abs(candle.close - candle.open);
    const atrMultiple = atr && atr > 0 ? body / atr : 0;
    const hasFvg = fvgAt(candles, i) !== null;

    const isCounterTrend = lastDirection !== null && lastDirection !== direction;
    let kind: StructureKind;
    if (!isCounterTrend) {
      kind = "bos";
    } else {
      const displaced =
        atrMultiple >= opts.minDisplacementAtr && (!opts.requireFvg || hasFvg);
      kind = displaced ? "mss" : "choch";
    }

    breaks.push({ kind, direction, index: i, time: candle.time, level, atrMultiple, hasFvg });
    lastDirection = direction;
  }

  return breaks;
}

/** The prevailing structural direction going into `index`, or null if unclear. */
export function trendAt(
  candles: Candle[],
  index: number,
  options: Partial<StructureOptions> = {},
): Direction | null {
  const breaks = findStructureBreaks(candles, 1, index, options);
  const last = lastOf(breaks);
  return last ? last.direction : null;
}

function lastOf<T>(items: T[]): T | null {
  return items.length > 0 ? (items[items.length - 1] as T) : null;
}

/** Swings confirmed at or before `index`, for callers building their own logic. */
export function confirmedSwings(
  candles: Candle[],
  index: number,
  swingStrength = 2,
): Swing[] {
  return findSwings(candles, swingStrength).filter(
    (swing) => swing.index + swingStrength <= index,
  );
}
