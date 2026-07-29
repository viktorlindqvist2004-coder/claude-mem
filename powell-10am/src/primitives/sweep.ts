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
 *   2. Rejection — the candle must close back on the original side of the
 *      level. Trading through and *closing* through is expansion, and expansion
 *      is the one thing this model must not trade into.
 */

import type { Candle, Sweep } from "../types.js";
import type { LiquidityPool } from "./liquidity.js";

export interface SweepOptions {
  /** Minimum penetration as a fraction of `referenceRange`. */
  minPenetration: number;
  /** Require the sweeping candle to close back inside. */
  requireCloseBackInside: boolean;
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

  for (let i = Math.max(0, from); i <= Math.min(to, candles.length - 1); i++) {
    const candle = candles[i];
    if (!candle) continue;

    let best: { sweep: Sweep; weight: number; penetration: number } | null = null;

    for (const pool of pools) {
      // The pool must predate the candle testing it.
      if (pool.time >= candle.time) continue;

      if (pool.side === "high") {
        const penetration = candle.high - pool.price;
        if (penetration < minDistance || penetration <= 0) continue;
        if (options.requireCloseBackInside && candle.close >= pool.price) continue;
        const sweep: Sweep = {
          index: i,
          time: candle.time,
          level: pool.price,
          extreme: candle.high,
          side: "high",
          source: pool.label,
        };
        if (!best || pool.weight > best.weight || (pool.weight === best.weight && penetration > best.penetration)) {
          best = { sweep, weight: pool.weight, penetration };
        }
      } else {
        const penetration = pool.price - candle.low;
        if (penetration < minDistance || penetration <= 0) continue;
        if (options.requireCloseBackInside && candle.close <= pool.price) continue;
        const sweep: Sweep = {
          index: i,
          time: candle.time,
          level: pool.price,
          extreme: candle.low,
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
