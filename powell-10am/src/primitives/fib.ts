/**
 * Fibonacci tooling as ICT uses it — which is not how most retail material uses
 * it. Two distinct jobs, and conflating them is the classic beginner error:
 *
 *  1. RETRACEMENT into a dealing range, to find where to enter (the OTE zone).
 *  2. PROJECTION beyond the range, to find where to exit (standard deviations).
 *
 * The anchor matters more than the numbers. For the 10am model the dealing
 * range is always the manipulation leg: from the swept extreme to the extreme
 * of the displacement that reclaimed the key open. Anchoring anywhere else
 * produces levels that look meaningful and are not.
 */

import type { Direction } from "../types.js";

/** A price range with a direction of travel, used as the fib anchor. */
export interface DealingRange {
  /** Where the leg began — 0.0 on the retracement scale. */
  from: number;
  /** Where the leg ended — 1.0 on the retracement scale. */
  to: number;
  direction: Direction;
}

/** The canonical ICT retracement levels. */
export const FIB_LEVELS = {
  /** Range midpoint. Above it is premium, below it is discount. */
  equilibrium: 0.5,
  /** Start of the Optimal Trade Entry window. */
  oteStart: 0.62,
  /** The 70.5% "sweet spot" ICT singles out inside the OTE window. */
  oteSweet: 0.705,
  /** End of the OTE window. Deeper than this and the leg is failing. */
  oteEnd: 0.79,
  /** A full retracement invalidates the premise. */
  invalidation: 1.0,
} as const;

/**
 * Standard deviation projections used as targets, measured beyond the range in
 * the direction of travel. Negative by ICT convention because they sit past the
 * 0.0 anchor on the retracement scale.
 */
export const STD_DEV_PROJECTIONS = [-0.27, -0.62, -1.0, -1.5, -2.0, -2.5, -4.0] as const;

export type StdDevProjection = (typeof STD_DEV_PROJECTIONS)[number];

/**
 * Price at a given retracement ratio of the range.
 *
 * `ratio` 0 returns `from`, 1 returns `to`, 0.705 returns the OTE sweet spot,
 * and negative ratios project beyond `from` — which is exactly what the
 * standard deviation targets are.
 */
export function fibPrice(range: DealingRange, ratio: number): number {
  return range.to + (range.from - range.to) * ratio;
}

/** The OTE band: entries are sought between 62% and 79% of the leg. */
export function oteZone(range: DealingRange): { start: number; sweet: number; end: number } {
  return {
    start: fibPrice(range, FIB_LEVELS.oteStart),
    sweet: fibPrice(range, FIB_LEVELS.oteSweet),
    end: fibPrice(range, FIB_LEVELS.oteEnd),
  };
}

/** True when `price` sits inside the OTE band, edges inclusive. */
export function inOte(range: DealingRange, price: number): boolean {
  const zone = oteZone(range);
  const top = Math.max(zone.start, zone.end);
  const bottom = Math.min(zone.start, zone.end);
  return price >= bottom && price <= top;
}

export function equilibrium(range: DealingRange): number {
  return fibPrice(range, FIB_LEVELS.equilibrium);
}

/**
 * Premium/discount classification. ICT's rule of thumb: only sell in premium,
 * only buy in discount, relative to the range being dealt in.
 */
export function premiumDiscount(
  range: DealingRange,
  price: number,
): "premium" | "discount" | "equilibrium" {
  const mid = equilibrium(range);
  const top = Math.max(range.from, range.to);
  const bottom = Math.min(range.from, range.to);
  // A band around the midpoint worth 1% of the range counts as equilibrium.
  const tolerance = (top - bottom) * 0.01;
  if (price > mid + tolerance) return "premium";
  if (price < mid - tolerance) return "discount";
  return "equilibrium";
}

/** All standard deviation targets for a range, nearest first. */
export function projections(range: DealingRange): { ratio: number; price: number }[] {
  return STD_DEV_PROJECTIONS.map((ratio) => ({ ratio, price: fibPrice(range, ratio) }));
}

/**
 * The first projection at or beyond `minDistance` from `entry`, used to pick a
 * target that actually clears the minimum reward:risk filter instead of the
 * nearest one.
 */
export function projectionBeyond(
  range: DealingRange,
  entry: number,
  minDistance: number,
): { ratio: number; price: number } | null {
  for (const projection of projections(range)) {
    if (Math.abs(projection.price - entry) >= minDistance) {
      // Must also be on the correct side of the entry.
      if (range.direction === "long" && projection.price > entry) return projection;
      if (range.direction === "short" && projection.price < entry) return projection;
    }
  }
  return null;
}
