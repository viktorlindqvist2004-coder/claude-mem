/**
 * Trade simulation.
 *
 * Turning a `Setup` into a result requires deciding several things that quietly
 * determine whether a backtest tells the truth:
 *
 *  - FILL. A limit order fills when price trades to it, not when a candle
 *    closes past it. The order is only working from `armedFromIndex`, i.e.
 *    after the displacement candle closed — never on the candle that created
 *    the signal.
 *  - AMBIGUITY. When one candle contains both the stop and the target, intrabar
 *    order is unknowable from OHLC. This resolves it as a loss. That is
 *    pessimistic by construction, and it is the correct bias for a backtest:
 *    the alternative flatters every result you will ever produce.
 *  - EXCURSION. MFE and MAE are tracked so you can see how much heat a winner
 *    took and how far a loser ran before failing.
 */

import type { Candle, Trade, TradeOutcome } from "./types.js";
import type { Setup } from "./model.js";
import type { ModelConfig } from "./spec.js";
import { DEFAULT_CONFIG } from "./spec.js";

export function simulate(
  candles: Candle[],
  setup: Setup,
  config: ModelConfig = DEFAULT_CONFIG,
): Trade {
  const risk = Math.abs(setup.entryPrice - setup.stopPrice);
  const isLong = setup.direction === "long";

  // ---- Fill ------------------------------------------------------------
  let entryIndex: number | null = null;
  for (let i = setup.armedFromIndex; i <= Math.min(setup.entryCutoffIndex, candles.length - 1); i++) {
    const candle = candles[i];
    if (!candle) continue;
    // A retracement limit fills when price trades back to it.
    const filled = isLong
      ? candle.low <= setup.entryPrice
      : candle.high >= setup.entryPrice;
    if (filled) {
      entryIndex = i;
      break;
    }
  }

  if (entryIndex === null) {
    return unfilled(setup);
  }

  const entryCandle = candles[entryIndex] as Candle;

  // ---- Manage ----------------------------------------------------------
  let stopPrice = setup.stopPrice;
  let outcome: TradeOutcome = "timeout";
  let exitPrice: number | null = null;
  let exitTime: number | null = null;
  let maxFavourable = 0;
  let maxAdverse = 0;
  /** Fraction of the position still open. */
  let openSize = 1;
  /** Result already banked from partials, in R. */
  let bankedR = 0;

  const partialPrice =
    config.partialAtR === null
      ? null
      : isLong
        ? setup.entryPrice + risk * config.partialAtR
        : setup.entryPrice - risk * config.partialAtR;
  let partialTaken = false;

  const breakEvenPrice =
    config.breakEvenAtR === null
      ? null
      : isLong
        ? setup.entryPrice + risk * config.breakEvenAtR
        : setup.entryPrice - risk * config.breakEvenAtR;

  const lastIndex = Math.min(setup.flattenIndex, candles.length - 1);

  for (let i = entryIndex; i <= lastIndex; i++) {
    const candle = candles[i];
    if (!candle) continue;

    const favourable = isLong
      ? (candle.high - setup.entryPrice) / risk
      : (setup.entryPrice - candle.low) / risk;
    const adverse = isLong
      ? (setup.entryPrice - candle.low) / risk
      : (candle.high - setup.entryPrice) / risk;
    maxFavourable = Math.max(maxFavourable, favourable);
    maxAdverse = Math.max(maxAdverse, adverse);

    const hitStop = isLong ? candle.low <= stopPrice : candle.high >= stopPrice;
    const hitTarget = isLong
      ? candle.high >= setup.targetPrice
      : candle.low <= setup.targetPrice;

    // Stop is checked first: when a single candle spans both levels the
    // intrabar sequence is unknowable, so the loss is assumed.
    if (hitStop) {
      const stopR = ((isLong ? stopPrice - setup.entryPrice : setup.entryPrice - stopPrice) / risk) * openSize;
      bankedR += stopR;
      outcome = bankedR > 0 ? "target" : "stop";
      exitPrice = stopPrice;
      exitTime = candle.time;
      openSize = 0;
      break;
    }

    if (partialPrice !== null && !partialTaken) {
      const hitPartial = isLong ? candle.high >= partialPrice : candle.low <= partialPrice;
      if (hitPartial) {
        const half = openSize / 2;
        bankedR += (config.partialAtR as number) * half;
        openSize -= half;
        partialTaken = true;
      }
    }

    if (breakEvenPrice !== null) {
      const reached = isLong ? candle.high >= breakEvenPrice : candle.low <= breakEvenPrice;
      if (reached) stopPrice = setup.entryPrice;
    }

    if (hitTarget) {
      bankedR += setup.plannedR * openSize;
      openSize = 0;
      outcome = "target";
      exitPrice = setup.targetPrice;
      exitTime = candle.time;
      break;
    }
  }

  // ---- Timeout ---------------------------------------------------------
  if (openSize > 0) {
    const finalCandle = candles[lastIndex];
    if (finalCandle) {
      const closeR =
        ((isLong ? finalCandle.close - setup.entryPrice : setup.entryPrice - finalCandle.close) / risk) *
        openSize;
      bankedR += closeR;
      exitPrice = finalCandle.close;
      exitTime = finalCandle.time;
    }
    outcome = "timeout";
  }

  return {
    date: setup.date,
    direction: setup.direction,
    entryTime: entryCandle.time,
    entryPrice: setup.entryPrice,
    stopPrice: setup.stopPrice,
    targetPrice: setup.targetPrice,
    exitTime,
    exitPrice,
    outcome,
    r: round(bankedR),
    plannedR: round(setup.plannedR),
    maxFavourableR: round(maxFavourable),
    maxAdverseR: round(maxAdverse),
    entryLabel: setup.entryLabel,
    targetLabel: setup.targetLabel,
    read: setup.read,
  };
}

function unfilled(setup: Setup): Trade {
  return {
    date: setup.date,
    direction: setup.direction,
    entryTime: 0,
    entryPrice: setup.entryPrice,
    stopPrice: setup.stopPrice,
    targetPrice: setup.targetPrice,
    exitTime: null,
    exitPrice: null,
    outcome: "no-fill",
    r: 0,
    plannedR: round(setup.plannedR),
    maxFavourableR: 0,
    maxAdverseR: 0,
    entryLabel: setup.entryLabel,
    targetLabel: setup.targetLabel,
    read: setup.read,
  };
}

function round(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}
