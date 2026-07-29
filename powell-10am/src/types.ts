/**
 * Core domain types for the Powell 10am Key Open model.
 *
 * Every price series in this project is a list of `Candle`s ordered oldest
 * first, with `time` as a UTC epoch in milliseconds. Session logic converts to
 * America/New_York wall-clock on demand (see `time.ts`) rather than storing
 * local times, so a dataset spanning a DST boundary stays correct.
 */

export interface Candle {
  /** UTC epoch milliseconds of the candle's OPEN. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type Direction = "long" | "short";

/** The three key opens Powell anchors his day around, in ET wall-clock. */
export type KeyOpenName = "asia" | "midnight" | "nyam";

export interface KeyOpen {
  name: KeyOpenName;
  /** ET hour of the open. */
  hour: number;
  /** ET minute of the open. */
  minute: number;
  /** Price at which the anchoring candle opened. */
  price: number;
  /** UTC epoch ms of the anchoring candle. */
  time: number;
}

/** A swing point in market structure. */
export interface Swing {
  index: number;
  time: number;
  price: number;
  kind: "high" | "low";
}

/**
 * A Fair Value Gap: a three-candle imbalance where candle 1 and candle 3 do
 * not overlap. `proximal` is the edge price first touched on a retracement,
 * `distal` the far edge, `ce` the consequent encroachment (midpoint).
 */
export interface FVG {
  /** Index of the middle (displacement) candle. */
  index: number;
  time: number;
  direction: Direction;
  /** Edge price reached first when price retraces back into the gap. */
  proximal: number;
  /** Far edge of the gap. */
  distal: number;
  /** Consequent encroachment — the 50% level of the gap. */
  ce: number;
  size: number;
  /** True when this gap has been traded through and is being used inverted. */
  inverted: boolean;
}

/** A liquidity sweep: price trades beyond a reference level and reverses. */
export interface Sweep {
  index: number;
  time: number;
  /** The level that was taken out. */
  level: number;
  /** The extreme price printed while sweeping. */
  extreme: number;
  /** `high` = a high was swept (bearish intent), `low` = a low was swept. */
  side: "high" | "low";
  /** Where the reference level came from, for auditability. */
  source: string;
}

/** An energetic directional move that leaves an imbalance behind. */
export interface Displacement {
  startIndex: number;
  endIndex: number;
  time: number;
  direction: Direction;
  /** Net move in price terms. */
  magnitude: number;
  /** Magnitude expressed in units of recent average range. */
  atrMultiple: number;
  /** The gap left by the move, if any. */
  fvg: FVG | null;
}

/** The Power-of-3 read on a single 10am key open. */
export interface Po3Read {
  /** ET calendar date, `YYYY-MM-DD`. */
  date: string;
  keyOpen: KeyOpen;
  /** Range built before the manipulation leg. */
  accumulation: { high: number; low: number; fromIndex: number; toIndex: number } | null;
  manipulation: Sweep | null;
  distribution: Displacement | null;
  /** Direction the model expects to trade, derived from the manipulation leg. */
  bias: Direction | null;
  /** Contextual bias from the key levels, independent of the sweep. */
  contextBias: Direction | null;
  /** The fib anchor: swept extreme → displacement extreme. */
  dealingRange: { from: number; to: number; direction: Direction } | null;
  /** OTE band derived from `dealingRange`. */
  ote: { start: number; sweet: number; end: number } | null;
  /** Standard deviation objectives projected from the manipulation leg. */
  projections: { ratio: number; price: number }[];
  /** Key levels in force at the key open. */
  levels: { kind: string; price: number; label: string; weight: number }[];
  /** Structure break that carried the distribution leg, if any. */
  structure: { kind: string; direction: Direction; level: number; atrMultiple: number } | null;
  /** SMT read at the sweep, when a correlated series was supplied. */
  smt: { present: boolean; detail: string } | null;
  /** Why the read stopped where it did, when no complete setup formed. */
  rejectedReason?: string;
}

export type TradeOutcome = "target" | "stop" | "timeout" | "no-fill";

export interface Trade {
  date: string;
  direction: Direction;
  entryTime: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  exitTime: number | null;
  exitPrice: number | null;
  outcome: TradeOutcome;
  /** Realised result in units of initial risk. */
  r: number;
  /** Planned reward:risk at entry. */
  plannedR: number;
  /** Best unrealised excursion in R, for exit-quality analysis. */
  maxFavourableR: number;
  /** Worst unrealised excursion in R — how close the stop came to being hit. */
  maxAdverseR: number;
  /** Where the entry price came from, e.g. "fvg-proximal ∩ OTE". */
  entryLabel: string;
  /** Where the target came from, e.g. "prior day high". */
  targetLabel: string;
  read: Po3Read;
}

export interface DayResult {
  date: string;
  read: Po3Read;
  trade: Trade | null;
  /** Set when the day produced no trade at all. */
  skipped?: string;
}
