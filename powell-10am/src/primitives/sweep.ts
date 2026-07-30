/**
 * Liquidity sweeps — the manipulation leg.
 *
 * A sweep is not "price went past a level". It is price going past a level and
 * being rejected, which is what tells you the move existed to fill orders
 * rather than to go somewhere. Two tests enforce that here:
 *
 *   1. Penetration — it must clear the level by a meaningful amount, not graze
 *      it by a tick. Measured against the reference range so it scales with
 *      volatility instead of being a hard-coded number of points.
 *   2. Rejection — price must close back on the original side of the level.
 *      Trading through and *closing* through is expansion, and expansion is the
 *      one thing this model must not trade into.
 *
 * ## How long the rejection is allowed to take
 *
 * `reclaimBars` is the parameter that decides how strict test 2 is, and it was
 * originally not a parameter at all: the candle that printed the extreme had to
 * close back inside *itself*. That is the strictest reading available, and the
 * journal suggests it is too strict — four of eleven reviewed days were rejected
 * with the identical reason "closed through the opening range low", which is a
 * suspicious amount of expansion for one direction in a fortnight.
 *
 * A raid frequently takes more than one candle: a push through the level, a
 * further probe, then the reclaim. Someone watching that live calls it a raid.
 * With `reclaimBars: 1` the engine calls it expansion and stands aside.
 *
 * So the window is configurable, the extreme is taken across the whole
 * excursion rather than from the penetrating candle alone, and the sweep is
 * reported as known at the *reclaim* bar — not the penetrating one — because
 * that is the first moment the rejection is a fact rather than a hope.
 */

import type { Candle, Sweep } from "../types.js";
import type { LiquidityPool } from "./liquidity.js";

export interface SweepOptions {
  /** Minimum penetration as a fraction of `referenceRange`. */
  minPenetration: number;
  /** Require price to close back inside the level. */
  requireCloseBackInside: boolean;
  /**
   * How many candles the reclaim may take, counted from the penetrating one.
   * 1 means the candle that printed the extreme must itself close back inside.
   */
  reclaimBars?: number;
  /** Range used to scale the penetration test (typically the accumulation range). */
  referenceRange: number;
}

/**
 * Scan `[from, to]` for the first candle that sweeps any of `pools`.
 *
 * When several pools are taken by the same candle, the one with the greatest
 * weight wins, then the deepest penetration — the model wants the most
 * significant stops that were run, not the first one found.
 */
export function findSweep(
  candles: Candle[],
  pools: LiquidityPool[],
  from: number,
  to: number,
  options: SweepOptions,
): Sweep | null {
  const minDistance = Math.max(options.referenceRange * options.minPenetration, 0);

  const reclaimBars = Math.max(1, options.reclaimBars ?? 1);
  const lastIndex = candles.length - 1;

  /**
   * Where the reclaim completes, and how far price ran before it did.
   *
   * Returns null when price never closed back inside within the allowance —
   * that is expansion. The lookahead may finish a few bars past `to`: the raid
   * has to *start* inside the manipulation window, but forbidding its
   * confirmation from spilling over would reject a raid on the window's last
   * candle purely for arriving late.
   */
  const confirmReclaim = (
    start: number,
    price: number,
    side: "high" | "low",
  ): { index: number; extreme: number } | null => {
    let extreme = side === "high" ? -Infinity : Infinity;
    const limit = Math.min(start + reclaimBars - 1, lastIndex);
    for (let j = start; j <= limit; j++) {
      const bar = candles[j];
      if (!bar) continue;
      extreme = side === "high" ? Math.max(extreme, bar.high) : Math.min(extreme, bar.low);
      const inside = side === "high" ? bar.close < price : bar.close > price;
      if (inside) return { index: j, extreme };
    }
    return null;
  };

  for (let i = Math.max(0, from); i <= Math.min(to, lastIndex); i++) {
    const candle = candles[i];
    if (!candle) continue;

    let best: { sweep: Sweep; weight: number; penetration: number } | null = null;

    for (const pool of pools) {
      // The pool must predate the candle testing it.
      if (pool.time >= candle.time) continue;

      if (pool.side === "high") {
        const penetration = candle.high - pool.price;
        if (penetration < minDistance || penetration <= 0) continue;
        let index = i;
        let extreme = candle.high;
        if (options.requireCloseBackInside) {
          const reclaim = confirmReclaim(i, pool.price, "high");
          if (!reclaim) continue;
          index = reclaim.index;
          extreme = reclaim.extreme;
        }
        const sweep: Sweep = {
          index,
          time: candle.time,
          level: pool.price,
          extreme,
          side: "high",
          source: pool.label,
        };
        if (!best || pool.weight > best.weight || (pool.weight === best.weight && penetration > best.penetration)) {
          best = { sweep, weight: pool.weight, penetration };
        }
      } else {
        const penetration = pool.price - candle.low;
        if (penetration < minDistance || penetration <= 0) continue;
        let index = i;
        let extreme = candle.low;
        if (options.requireCloseBackInside) {
          const reclaim = confirmReclaim(i, pool.price, "low");
          if (!reclaim) continue;
          index = reclaim.index;
          extreme = reclaim.extreme;
        }
        const sweep: Sweep = {
          index,
          time: candle.time,
          level: pool.price,
          extreme,
          side: "low",
          source: pool.label,
        };
        if (!best || pool.weight > best.weight || (pool.weight === best.weight && penetration > best.penetration)) {
          best = { sweep, weight: pool.weight, penetration };
        }
      }
    }

    if (best) return best.sweep;
  }

  return null;
}

/**
 * The extreme printed between the sweep and `to`, on the sweep's side. The stop
 * belongs beyond this, not merely beyond the sweeping candle — price often
 * probes a little further before the reversal takes hold.
 */
export function sweepExtreme(candles: Candle[], sweep: Sweep, to: number): number {
  let extreme = sweep.extreme;
  for (let i = sweep.index; i <= Math.min(to, candles.length - 1); i++) {
    const candle = candles[i];
    if (!candle) continue;
    if (sweep.side === "high") extreme = Math.max(extreme, candle.high);
    else extreme = Math.min(extreme, candle.low);
  }
  return extreme;
}
