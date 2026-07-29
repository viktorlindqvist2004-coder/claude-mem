/**
 * Liquidity: where the stops are.
 *
 * The 10am model is a raid model — it does not predict direction from
 * indicators, it waits for price to take a known pool of stops and then trades
 * away from it. So the quality of the whole model rests on identifying pools
 * correctly. This module enumerates them, ranked by how much resting order flow
 * they plausibly hold.
 */

import type { Candle, Swing } from "../types.js";
import { findSwings } from "./swing.js";

export type PoolKind =
  | "equal-highs"
  | "equal-lows"
  | "swing-high"
  | "swing-low"
  | "session-high"
  | "session-low"
  | "prior-day-high"
  | "prior-day-low"
  | "opening-range-high"
  | "opening-range-low";

export interface LiquidityPool {
  kind: PoolKind;
  side: "high" | "low";
  price: number;
  /** Epoch ms at which the pool became knowable. */
  time: number;
  /**
   * Relative significance, 1-5. Equal highs/lows and prior-day extremes hold
   * more stops than an arbitrary intraday swing.
   */
  weight: number;
  /** Human-readable provenance, carried into trade logs for auditability. */
  label: string;
}

/**
 * Equal highs/lows — the strongest intraday pools, because every breakout
 * trader's stop sits just past a double top or bottom.
 *
 * `tolerance` is the fraction of the observed range within which two extremes
 * count as "equal"; exact ticks are rare and demanding them finds nothing.
 */
export function findEqualLevels(swings: Swing[], tolerance = 0.0005): LiquidityPool[] {
  const pools: LiquidityPool[] = [];
  const highs = swings.filter((s) => s.kind === "high");
  const lows = swings.filter((s) => s.kind === "low");

  for (const group of [highs, lows]) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (!a || !b) continue;
        const spread = Math.abs(a.price - b.price);
        if (spread / Math.max(a.price, 1) > tolerance) continue;

        const side = a.kind;
        pools.push({
          kind: side === "high" ? "equal-highs" : "equal-lows",
          side,
          // Take the extreme of the pair — stops rest beyond the furthest one.
          price: side === "high" ? Math.max(a.price, b.price) : Math.min(a.price, b.price),
          time: Math.max(a.time, b.time),
          weight: 5,
          label: `equal ${side}s`,
        });
      }
    }
  }

  return dedupe(pools);
}

/** Every pool visible in `candles[from..to]`, plus any externally supplied ones. */
export function findPools(
  candles: Candle[],
  from: number,
  to: number,
  swingStrength = 2,
): LiquidityPool[] {
  const slice = candles.slice(Math.max(0, from), Math.min(to + 1, candles.length));
  if (slice.length === 0) return [];

  const swings = findSwings(slice, swingStrength).map((swing) => ({
    ...swing,
    index: swing.index + Math.max(0, from),
  }));

  const pools: LiquidityPool[] = swings.map((swing) => ({
    kind: swing.kind === "high" ? "swing-high" : "swing-low",
    side: swing.kind,
    price: swing.price,
    time: swing.time,
    weight: 2,
    label: `swing ${swing.kind}`,
  }));

  pools.push(...findEqualLevels(swings));
  return dedupe(pools);
}

/** Highest high and lowest low of a slice, as a pair of pools. */
export function rangePools(
  candles: Candle[],
  from: number,
  to: number,
  kindHigh: PoolKind,
  kindLow: PoolKind,
  label: string,
  weight = 4,
): LiquidityPool[] {
  let high = -Infinity;
  let low = Infinity;
  let highTime = 0;
  let lowTime = 0;

  for (let i = Math.max(0, from); i <= Math.min(to, candles.length - 1); i++) {
    const candle = candles[i];
    if (!candle) continue;
    if (candle.high > high) {
      high = candle.high;
      highTime = candle.time;
    }
    if (candle.low < low) {
      low = candle.low;
      lowTime = candle.time;
    }
  }

  if (high === -Infinity || low === Infinity) return [];
  return [
    { kind: kindHigh, side: "high", price: high, time: highTime, weight, label: `${label} high` },
    { kind: kindLow, side: "low", price: low, time: lowTime, weight, label: `${label} low` },
  ];
}

/**
 * The nearest pool on `side` strictly beyond `price` — the natural draw for a
 * trade running in that direction, and therefore the natural target.
 */
export function nearestPool(
  pools: LiquidityPool[],
  side: "high" | "low",
  price: number,
  minWeight = 1,
): LiquidityPool | null {
  const candidates = pools
    .filter((pool) => pool.side === side && pool.weight >= minWeight)
    .filter((pool) => (side === "high" ? pool.price > price : pool.price < price))
    .sort((a, b) =>
      side === "high" ? a.price - b.price : b.price - a.price,
    );
  return candidates[0] ?? null;
}

/**
 * The strongest pool beyond `price`, preferring weight over proximity. Useful
 * when the model wants a draw worth holding for rather than the first level up.
 */
export function strongestPool(
  pools: LiquidityPool[],
  side: "high" | "low",
  price: number,
): LiquidityPool | null {
  const candidates = pools
    .filter((pool) => pool.side === side)
    .filter((pool) => (side === "high" ? pool.price > price : pool.price < price))
    .sort((a, b) => b.weight - a.weight || (side === "high" ? a.price - b.price : b.price - a.price));
  return candidates[0] ?? null;
}

function dedupe(pools: LiquidityPool[]): LiquidityPool[] {
  const seen = new Map<string, LiquidityPool>();
  for (const pool of pools) {
    const key = `${pool.kind}:${pool.price.toFixed(6)}`;
    const existing = seen.get(key);
    if (!existing || pool.weight > existing.weight) seen.set(key, pool);
  }
  return [...seen.values()].sort((a, b) => a.time - b.time);
}
