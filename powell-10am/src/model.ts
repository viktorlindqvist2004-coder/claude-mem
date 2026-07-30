/**
 * The 10am Key Open model.
 *
 * One pass over one trading day produces a `Po3Read` — the model's complete
 * reading of that day — and, when every condition is met, a `Setup` carrying
 * the entry, stop and target. Nothing here simulates the trade; that is
 * `trade.ts`. Keeping the read separate from the fill is what lets the same
 * detector drive a backtest, a live alert and a teaching walkthrough.
 *
 * The sequence, in order, is fixed:
 *
 *   1. ACCUMULATION   09:30–10:00 builds a range and therefore a pool of stops.
 *   2. KEY OPEN       10:00 opens the NY AM 4-hour candle. This is the axis.
 *   3. MANIPULATION   Price raids one side of that range. Direction is now set:
 *                     the trade is away from the raid, always.
 *   4. DISTRIBUTION   Price displaces back through the key open, leaving a gap.
 *   5. ENTRY          Retrace into the gap and/or the OTE band of the raid leg.
 *   6. RISK           Stop beyond the raid extreme, target at opposing liquidity.
 *
 * Every step can fail, and a failed step sets `rejectedReason` rather than
 * throwing — a day with no setup is a normal outcome, not an error.
 */

import type {
  Candle,
  Direction,
  FVG,
  KeyOpen,
  Po3Read,
  Sweep,
} from "./types.js";
import { minutesOf, etWeekday } from "./time.js";
import { indexAtMinute, indexBeforeMinute } from "./series-index.js";
import { buildLevels, levelsAsOf, findLevel, type KeyLevel } from "./levels.js";
import { atrAt } from "./primitives/atr.js";
import { findPools, nearestPool, strongestPool, type LiquidityPool } from "./primitives/liquidity.js";
import { findSweep, sweepExtreme } from "./primitives/sweep.js";
import { findDisplacement } from "./primitives/displacement.js";
import { findStructureBreaks, trendAt } from "./primitives/structure.js";
import { detectSmt } from "./primitives/smt.js";
import { fvgAt, invert } from "./primitives/fvg.js";
import {
  fibPrice,
  oteZone,
  premiumDiscount,
  projections,
  type DealingRange,
} from "./primitives/fib.js";
import type { ModelConfig, RangeBasis } from "./spec.js";
import { DEFAULT_CONFIG } from "./spec.js";

/** A complete, tradeable plan produced by the model. */
export interface Setup {
  date: string;
  direction: Direction;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  plannedR: number;
  entryLabel: string;
  targetLabel: string;
  /** Earliest index at which the entry order could be working. */
  armedFromIndex: number;
  /** Index past which the setup is abandoned unfilled. */
  entryCutoffIndex: number;
  /** Index at which any open position is flattened. */
  flattenIndex: number;
  read: Po3Read;
}

export interface ReadResult {
  read: Po3Read;
  setup: Setup | null;
}

export interface ReadOptions {
  /** Correlated series (e.g. ES when trading NQ) for the SMT check. */
  correlated?: Candle[];
}

/**
 * Read one ET trading date.
 *
 * `candles` is the full series, not just the day — the model needs the prior
 * session for its levels, and the ATR needs history that predates the open.
 */
export function readDay(
  candles: Candle[],
  date: string,
  config: ModelConfig = DEFAULT_CONFIG,
  options: ReadOptions = {},
): ReadResult {
  const keyOpenIndex = indexAtEtTime(candles, date, config.keyOpen);
  if (keyOpenIndex === null) {
    return { read: emptyRead(date, null), setup: null };
  }

  const keyOpenCandle = candles[keyOpenIndex] as Candle;
  const keyOpen: KeyOpen = {
    name: "nyam",
    hour: Math.floor(minutesOf(config.keyOpen) / 60),
    minute: minutesOf(config.keyOpen) % 60,
    price: keyOpenCandle.open,
    time: keyOpenCandle.time,
  };

  const read = emptyRead(date, keyOpen);

  // ---- Day filter -----------------------------------------------------
  if (!config.tradingDays.includes(etWeekday(keyOpenCandle.time))) {
    read.rejectedReason = "weekday excluded by config";
    return { read, setup: null };
  }

  // ---- Levels ---------------------------------------------------------
  const allLevels = buildLevels(candles, date, {
    keyOpen: config.keyOpen,
    asiaOpen: config.contextOpens.asia,
    midnightOpen: config.contextOpens.midnight,
    openingRangeStart: config.accumulationStart,
    openingRangeEnd: config.accumulationEnd,
  });
  const activeLevels = levelsAsOf(allLevels, keyOpenCandle.time);
  read.levels = activeLevels.map((entry) => ({
    kind: entry.kind,
    price: entry.price,
    label: entry.label,
    weight: entry.weight,
  }));

  // ---- 1. Accumulation ------------------------------------------------
  const accStart = indexAtEtTime(candles, date, config.accumulationStart);
  if (accStart === null) {
    read.rejectedReason = "no candles at accumulation start";
    return { read, setup: null };
  }
  const accEnd = keyOpenIndex - 1;
  const accumulation = extremesOf(candles, accStart, accEnd, config.rangeBasis);
  if (!accumulation) {
    read.rejectedReason = "empty accumulation range";
    return { read, setup: null };
  }
  read.accumulation = {
    high: accumulation.high,
    low: accumulation.low,
    fromIndex: accStart,
    toIndex: accEnd,
  };
  const accRange = accumulation.high - accumulation.low;

  // ---- Contextual bias -------------------------------------------------
  read.contextBias = contextBias(candles, keyOpenIndex, activeLevels, config);

  // ---- 2/3. Manipulation ----------------------------------------------
  const manipulationEnd = indexBeforeEtTime(candles, date, config.manipulationEnd) ?? candles.length - 1;
  const pools = buildPools(candles, accStart, accEnd, activeLevels, config);
  const sweep = findSweep(candles, pools, keyOpenIndex, manipulationEnd, {
    minPenetration: config.minSweepPenetration,
    requireCloseBackInside: config.requireCloseBackInside,
    reclaimBars: config.sweepReclaimBars,
    referenceRange: accRange,
  });

  if (!sweep) {
    read.rejectedReason = "no liquidity sweep inside the manipulation window";
    return { read, setup: null };
  }
  read.manipulation = sweep;

  // Direction is set by the raid: sweep the lows, trade up. Never the reverse.
  const direction: Direction = sweep.side === "low" ? "long" : "short";
  read.bias = direction;

  if (config.enforceBias && read.contextBias && read.contextBias !== direction) {
    read.rejectedReason = `sweep direction (${direction}) fights contextual bias (${read.contextBias})`;
    return { read, setup: null };
  }

  // ---- SMT confirmation ------------------------------------------------
  if (options.correlated && options.correlated.length > 0) {
    const smt = detectSmt(
      candles,
      options.correlated,
      keyOpenCandle.time,
      (candles[Math.min(manipulationEnd, candles.length - 1)] as Candle).time,
      sweep.side,
    );
    read.smt = { present: smt.present, detail: smt.detail };
    if (config.requireSmt && !smt.present) {
      read.rejectedReason = "SMT divergence required but not present at the sweep";
      return { read, setup: null };
    }
  } else if (config.requireSmt) {
    read.rejectedReason = "SMT required but no correlated series supplied";
    return { read, setup: null };
  }

  // ---- 4. Distribution -------------------------------------------------
  const displacementEnd = indexBeforeEtTime(candles, date, config.displacementEnd) ?? candles.length - 1;
  const displacement = findDisplacement(candles, direction, sweep.index, displacementEnd, {
    minAtrMultiple: config.minDisplacementAtr,
    atrPeriod: config.atrPeriod,
    requireFvg: config.requireFvg,
    reclaimPrice: config.requireKeyOpenReclaim ? keyOpen.price : null,
    maxCandles: config.maxDisplacementCandles,
  });

  if (!displacement) {
    read.rejectedReason = "no qualifying displacement back through the key open";
    return { read, setup: null };
  }
  read.distribution = displacement;

  // ---- Structure -------------------------------------------------------
  const breaks = findStructureBreaks(candles, sweep.index, displacement.endIndex, {
    swingStrength: config.swingStrength,
    atrPeriod: config.atrPeriod,
    minDisplacementAtr: config.minDisplacementAtr,
    requireFvg: config.requireFvg,
  });
  const aligned = breaks.filter((entry) => entry.direction === direction);
  const mss = aligned.find((entry) => entry.kind === "mss") ?? null;
  const chosen = mss ?? aligned[aligned.length - 1] ?? null;
  if (chosen) {
    read.structure = {
      kind: chosen.kind,
      direction: chosen.direction,
      level: chosen.level,
      atrMultiple: chosen.atrMultiple,
    };
  }
  if (config.requireMss && !mss) {
    read.rejectedReason = "market structure shift required but only a weak break formed";
    return { read, setup: null };
  }

  // ---- Fib framework ---------------------------------------------------
  // The dealing range is the manipulation leg: from the raid extreme to the
  // extreme of the displacement that reclaimed the open. Anchoring anywhere
  // else produces levels that look meaningful and are not.
  const manipulationExtreme = sweepExtreme(candles, sweep, displacement.startIndex);
  const displacementExtreme = legExtreme(
    candles,
    displacement.startIndex,
    displacement.endIndex,
    direction,
  );
  const dealingRange: DealingRange = {
    from: manipulationExtreme,
    to: displacementExtreme,
    direction,
  };
  read.dealingRange = { ...dealingRange };
  read.ote = oteZone(dealingRange);
  read.projections = projections(dealingRange);

  // ---- 5. Entry --------------------------------------------------------
  const atr = atrAt(candles, displacement.endIndex, config.atrPeriod);
  if (!atr || atr <= 0) {
    read.rejectedReason = "insufficient history for ATR";
    return { read, setup: null };
  }

  const entry = resolveEntry(candles, read, displacement.fvg, dealingRange, displacement.endIndex, config);
  if (!entry) {
    read.rejectedReason = "no entry could be placed under the configured entry mode";
    return { read, setup: null };
  }

  if (config.requirePremiumDiscount) {
    const zone = premiumDiscount(dealingRange, entry.price);
    const wanted = direction === "long" ? "discount" : "premium";
    if (zone !== wanted && zone !== "equilibrium") {
      read.rejectedReason = `entry sits in ${zone}, model requires ${wanted}`;
      return { read, setup: null };
    }
  }

  // ---- 6. Risk ---------------------------------------------------------
  const buffer = atr * config.stopBufferAtr;
  const stopPrice =
    direction === "long" ? manipulationExtreme - buffer : manipulationExtreme + buffer;
  const risk = Math.abs(entry.price - stopPrice);
  if (risk <= 0) {
    read.rejectedReason = "degenerate stop distance";
    return { read, setup: null };
  }

  const target = resolveTarget(entry.price, stopPrice, risk, direction, dealingRange, pools, activeLevels, config);
  if (!target) {
    read.rejectedReason = "no target available under the configured target mode";
    return { read, setup: null };
  }

  const plannedR = Math.abs(target.price - entry.price) / risk;
  if (plannedR < config.minPlannedR) {
    read.rejectedReason = `planned ${plannedR.toFixed(2)}R below the ${config.minPlannedR}R floor`;
    return { read, setup: null };
  }

  const entryCutoffIndex = indexBeforeEtTime(candles, date, config.entryCutoff) ?? candles.length - 1;
  const flattenIndex = indexBeforeEtTime(candles, date, config.flattenAt) ?? candles.length - 1;

  return {
    read,
    setup: {
      date,
      direction,
      entryPrice: entry.price,
      stopPrice,
      targetPrice: target.price,
      plannedR,
      entryLabel: entry.label,
      targetLabel: target.label,
      // The order can only work once the displacement candle has closed.
      armedFromIndex: displacement.endIndex + 1,
      entryCutoffIndex,
      flattenIndex,
      read,
    },
  };
}

// ---------------------------------------------------------------------
// entry / target resolution
// ---------------------------------------------------------------------

function resolveEntry(
  candles: Candle[],
  read: Po3Read,
  gap: FVG | null,
  range: DealingRange,
  displacementEnd: number,
  config: ModelConfig,
): { price: number; label: string } | null {
  const ote = oteZone(range);
  const usableGap = gap ?? (config.allowInverseFvg ? findInverseGap(candles, range, displacementEnd) : null);

  switch (config.entryMode) {
    case "fvg-proximal":
      return usableGap ? { price: usableGap.proximal, label: gapLabel(usableGap, "proximal") } : null;
    case "fvg-ce":
      return usableGap ? { price: usableGap.ce, label: gapLabel(usableGap, "CE") } : null;
    case "fvg-distal":
      return usableGap ? { price: usableGap.distal, label: gapLabel(usableGap, "distal") } : null;
    case "ote-sweet":
      return { price: ote.sweet, label: "OTE 70.5%" };
    case "ote-start":
      return { price: ote.start, label: "OTE 62%" };
    case "confluence": {
      if (!usableGap) return null;
      // Where the gap band and the OTE band overlap is the model's highest
      // conviction entry: an imbalance to fill AND a discount/premium price.
      const gapTop = Math.max(usableGap.proximal, usableGap.distal);
      const gapBottom = Math.min(usableGap.proximal, usableGap.distal);
      const oteTop = Math.max(ote.start, ote.end);
      const oteBottom = Math.min(ote.start, ote.end);
      const top = Math.min(gapTop, oteTop);
      const bottom = Math.max(gapBottom, oteBottom);
      if (top < bottom) return null;
      // Take the shallowest price inside the overlap so the order fills first.
      const price = range.direction === "long" ? top : bottom;
      return { price, label: `${gapLabel(usableGap, "band")} ∩ OTE` };
    }
    default:
      return null;
  }
}

/** An inverted gap on the correct side, used when the displacement left none. */
function findInverseGap(candles: Candle[], range: DealingRange, upTo: number): FVG | null {
  // Search backwards for the most recent opposing gap that price has already
  // traded through — it now acts in the model's favour.
  for (let i = upTo; i >= Math.max(1, upTo - 60); i--) {
    const candidate = fvgAt(candles, i);
    if (!candidate) continue;
    if (candidate.direction === range.direction) continue;
    const inverted = invert(candidate);
    const price = inverted.proximal;
    const top = Math.max(range.from, range.to);
    const bottom = Math.min(range.from, range.to);
    if (price <= top && price >= bottom) return inverted;
  }
  return null;
}

function gapLabel(gap: FVG, part: string): string {
  return `${gap.inverted ? "inverse " : ""}FVG ${part}`;
}

function resolveTarget(
  entryPrice: number,
  stopPrice: number,
  risk: number,
  direction: Direction,
  range: DealingRange,
  pools: LiquidityPool[],
  levels: KeyLevel[],
  config: ModelConfig,
): { price: number; label: string } | null {
  const side: "high" | "low" = direction === "long" ? "high" : "low";

  switch (config.targetMode) {
    case "opposing-liquidity": {
      const pool = nearestPool(pools, side, entryPrice, config.minPoolWeight);
      return pool ? { price: pool.price, label: pool.label } : null;
    }
    case "strongest-liquidity": {
      const pool = strongestPool(pools, side, entryPrice);
      return pool ? { price: pool.price, label: pool.label } : null;
    }
    case "std-dev": {
      const price = fibPrice(range, config.stdDevTarget);
      const correctSide = direction === "long" ? price > entryPrice : price < entryPrice;
      return correctSide ? { price, label: `${config.stdDevTarget} std dev projection` } : null;
    }
    case "key-level": {
      const candidates = levels
        .filter((entry) => (side === "high" ? entry.price > entryPrice : entry.price < entryPrice))
        .sort((a, b) => (side === "high" ? a.price - b.price : b.price - a.price));
      const chosen = candidates[0];
      return chosen ? { price: chosen.price, label: chosen.label } : null;
    }
    case "fixed-r": {
      const distance = risk * config.fixedR;
      const price = direction === "long" ? entryPrice + distance : entryPrice - distance;
      return { price, label: `fixed ${config.fixedR}R` };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------
// context
// ---------------------------------------------------------------------

/**
 * Bias derived from the standing levels rather than the sweep.
 *
 * Premium/discount doctrine: above the true day open price is in premium and
 * the model looks to sell; below it, discount, and it looks to buy. This is
 * deliberately the opposite of momentum reasoning.
 */
function contextBias(
  candles: Candle[],
  keyOpenIndex: number,
  levels: KeyLevel[],
  config: ModelConfig,
): Direction | null {
  const keyOpenCandle = candles[keyOpenIndex];
  if (!keyOpenCandle) return null;

  switch (config.biasSource) {
    case "midnight-open": {
      const midnight = findLevel(levels, "midnight-open");
      if (!midnight) return null;
      return keyOpenCandle.open > midnight.price ? "short" : "long";
    }
    case "prior-day-range": {
      const high = findLevel(levels, "prior-day-high");
      const low = findLevel(levels, "prior-day-low");
      if (!high || !low) return null;
      const zone = premiumDiscount(
        { from: low.price, to: high.price, direction: "long" },
        keyOpenCandle.open,
      );
      if (zone === "premium") return "short";
      if (zone === "discount") return "long";
      return null;
    }
    case "structure":
      return trendAt(candles, keyOpenIndex, {
        swingStrength: config.swingStrength,
        atrPeriod: config.atrPeriod,
        minDisplacementAtr: config.minDisplacementAtr,
        requireFvg: config.requireFvg,
      });
    case "sweep-only":
    default:
      return null;
  }
}

/**
 * The pools the manipulation leg is allowed to raid: intraday structure from
 * the accumulation window, plus the standing key levels when configured.
 */
function buildPools(
  candles: Candle[],
  accStart: number,
  accEnd: number,
  levels: KeyLevel[],
  config: ModelConfig,
): LiquidityPool[] {
  const pools = findPools(candles, accStart, accEnd, config.swingStrength);

  // The opening range extremes themselves are the most-watched stops of all.
  const extent = extremesOf(candles, accStart, accEnd, config.rangeBasis);
  const lastAccCandle = candles[accEnd];
  if (extent && lastAccCandle) {
    pools.push({
      kind: "opening-range-high",
      side: "high",
      price: extent.high,
      time: lastAccCandle.time,
      weight: 5,
      label: "opening range high",
    });
    pools.push({
      kind: "opening-range-low",
      side: "low",
      price: extent.low,
      time: lastAccCandle.time,
      weight: 5,
      label: "opening range low",
    });
  }

  if (config.includeKeyLevelsAsPools) {
    for (const entry of levels) {
      const side = poolSideForLevel(entry.kind);
      if (!side) continue;
      pools.push({
        kind: side === "high" ? "prior-day-high" : "prior-day-low",
        side,
        price: entry.price,
        time: entry.time,
        weight: entry.weight,
        label: entry.label,
      });
    }
  }

  return pools.filter((pool) => pool.weight >= config.minPoolWeight);
}

/** Which side of the book a standing level's stops sit on, if any. */
function poolSideForLevel(kind: string): "high" | "low" | null {
  if (kind.endsWith("-high")) return "high";
  if (kind.endsWith("-low")) return "low";
  return null;
}

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

function emptyRead(date: string, keyOpen: KeyOpen | null): Po3Read {
  return {
    date,
    keyOpen: keyOpen ?? { name: "nyam", hour: 10, minute: 0, price: NaN, time: 0 },
    accumulation: null,
    manipulation: null,
    distribution: null,
    bias: null,
    contextBias: null,
    dealingRange: null,
    ote: null,
    projections: [],
    levels: [],
    structure: null,
    smt: null,
    rejectedReason: keyOpen ? undefined : "no candle at the key open",
  };
}

/** Index of the candle whose ET wall-clock equals `hhmm` on `date`. */
export function indexAtEtTime(candles: Candle[], date: string, hhmm: string): number | null {
  return indexAtMinute(candles, date, minutesOf(hhmm));
}

/** Index of the last candle on `date` strictly before `hhmm`. */
export function indexBeforeEtTime(candles: Candle[], date: string, hhmm: string): number | null {
  return indexBeforeMinute(candles, date, minutesOf(hhmm));
}

/**
 * The extremes of a span, by wick or by body.
 *
 * `body` treats wicks as noise and bounds the range by opens and closes. It is
 * not a cosmetic choice: on both days measured pixel-by-pixel from screenshots,
 * 8 and 10 July 2026, the manipulation window raided nothing under `wick` and
 * raided the highs under `body` — by 15.2 and 23.4 points respectively. Zero
 * setups against two, from one word.
 *
 * Which is correct is unmeasured. `wick` remains the default because it is what
 * the model was built on, not because it has been shown to be better. See
 * observation 9a in journal/OBSERVATIONS.md.
 */
function extremesOf(
  candles: Candle[],
  from: number,
  to: number,
  basis: RangeBasis = "wick",
): { high: number; low: number } | null {
  let high = -Infinity;
  let low = Infinity;
  for (let i = Math.max(0, from); i <= Math.min(to, candles.length - 1); i++) {
    const candle = candles[i];
    if (!candle) continue;
    const top = basis === "body" ? Math.max(candle.open, candle.close) : candle.high;
    const bottom = basis === "body" ? Math.min(candle.open, candle.close) : candle.low;
    high = Math.max(high, top);
    low = Math.min(low, bottom);
  }
  if (high === -Infinity || low === Infinity) return null;
  return { high, low };
}

/** The furthest price the leg reached in its direction of travel. */
function legExtreme(candles: Candle[], from: number, to: number, direction: Direction): number {
  let extreme = direction === "long" ? -Infinity : Infinity;
  for (let i = Math.max(0, from); i <= Math.min(to, candles.length - 1); i++) {
    const candle = candles[i];
    if (!candle) continue;
    extreme = direction === "long" ? Math.max(extreme, candle.high) : Math.min(extreme, candle.low);
  }
  return extreme;
}

/** Re-exported so callers can inspect the sweep without importing the primitive. */
export type { Sweep };
