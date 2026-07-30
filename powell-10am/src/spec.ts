/**
 * The Powell 10am Key Open model, encoded as a machine-readable rule spec.
 *
 * This file is the single source of truth the engine executes AND the thing the
 * prose in `docs/` describes. If the two disagree, this file wins for behaviour
 * and the docs are the bug.
 *
 * PROVENANCE. Every rule carries a `confidence` marker so nothing here is
 * mistaken for gospel:
 *   - "sourced"  — corroborated by public descriptions of the model or of the
 *                  ICT concepts it is built from.
 *   - "inferred" — a standard construction the model is meaningless without,
 *                  filled in to make the rules executable.
 *   - "tunable"  — a free parameter with no canonical value. The default is a
 *                  starting point; `learn.ts` exists to test it.
 *
 * See `docs/08-sources.md` for exactly what was and was not verifiable.
 */

export type Confidence = "sourced" | "inferred" | "tunable";

export interface RuleNote {
  id: string;
  confidence: Confidence;
  note: string;
}

/** Where in the retracement the entry is placed. */
export type EntryMode =
  /** First edge of the displacement's fair value gap. Fills most often. */
  | "fvg-proximal"
  /** The gap's consequent encroachment (50%). */
  | "fvg-ce"
  /** Far edge of the gap. Best price, worst fill rate. */
  | "fvg-distal"
  /** 70.5% of the manipulation leg — the OTE sweet spot. */
  | "ote-sweet"
  /** Shallowest edge of the OTE band (62%). */
  | "ote-start"
  /** Where the gap and the OTE band overlap. The model's highest-conviction entry. */
  | "confluence";

/** How the profit target is chosen. */
export type TargetMode =
  /** Nearest opposing liquidity pool. */
  | "opposing-liquidity"
  /** Strongest opposing pool rather than the nearest. */
  | "strongest-liquidity"
  /** Standard deviation projection of the manipulation leg. */
  | "std-dev"
  /** A named key level on the opposing side. */
  | "key-level"
  /** A flat multiple of risk. */
  | "fixed-r";

/** What supplies the directional bias before the sweep even happens. */
export type BiasSource =
  /** Position relative to the midnight open (true day open). */
  | "midnight-open"
  /** Premium/discount within the prior day's range. */
  | "prior-day-range"
  /** Prevailing structure going into the open. */
  | "structure"
  /** No pre-bias; the sweep alone decides direction. */
  | "sweep-only";

export type RangeBasis = "wick" | "body";

export interface ModelConfig {
  // ---- Key opens -------------------------------------------------------
  /** ET wall-clock of the anchoring open. 10:00 opens the NY AM 4H candle. */
  keyOpen: string;
  /** The other two opens Powell anchors to, used for context and targets. */
  contextOpens: { asia: string; midnight: string };

  // ---- Phase windows (ET) ---------------------------------------------
  /** Start of the range whose liquidity the manipulation leg raids. */
  accumulationStart: string;
  /** End of accumulation — the key open itself, by construction of PO3. */
  accumulationEnd: string;
  /** Manipulation must occur inside `[keyOpen, manipulationEnd)`. */
  manipulationEnd: string;
  /** Displacement confirming distribution must occur by here. */
  displacementEnd: string;
  /** Entry must fill by here or the setup is abandoned. */
  entryCutoff: string;
  /** Any open position is flattened here. */
  flattenAt: string;

  // ---- Liquidity -------------------------------------------------------
  /** Fractal strength for swing detection. */
  swingStrength: number;
  /** Two extremes within this fraction of price count as equal highs/lows. */
  equalLevelTolerance: number;
  /** Only pools at or above this weight may be raided for a valid setup. */
  minPoolWeight: number;
  /** Include prior-day and session levels as raidable pools, not just swings. */
  includeKeyLevelsAsPools: boolean;

  // ---- Manipulation ----------------------------------------------------
  /**
   * A sweep must exceed the level by at least this fraction of the
   * accumulation range. Filters one-tick grazes that are not real raids.
   */
  minSweepPenetration: number;
  /** The sweeping candle must close back inside the range to count. */
  /**
   * Whether the accumulation range is bounded by wicks or by candle bodies.
   */
  rangeBasis: RangeBasis;
  requireCloseBackInside: boolean;
  /**
   * How many candles the reclaim may take, counted from the candle that
   * penetrated the level. 1 means that candle must itself close back inside.
   */
  sweepReclaimBars: number;

  // ---- Displacement / structure ---------------------------------------
  /** Minimum move size in ATR units to count as energetic. */
  minDisplacementAtr: number;
  /** Lookback for the ATR used above. */
  atrPeriod: number;
  /** Displacement must leave a fair value gap. */
  requireFvg: boolean;
  /** Displacement must close back through the key open price. */
  requireKeyOpenReclaim: boolean;
  /** Displacement must also register as a market structure shift. */
  requireMss: boolean;
  /** Longest run of candles that may be treated as one displacement leg. */
  maxDisplacementCandles: number;

  // ---- Entry -----------------------------------------------------------
  entryMode: EntryMode;
  /** Allow entering on an inverted FVG when no fresh gap remains. */
  allowInverseFvg: boolean;
  /** Entry must sit in discount (longs) / premium (shorts) of the leg. */
  requirePremiumDiscount: boolean;

  // ---- Risk ------------------------------------------------------------
  /** Stop sits beyond the manipulation extreme by this fraction of the ATR. */
  stopBufferAtr: number;
  targetMode: TargetMode;
  /** Standard deviation projection used when `targetMode` is `std-dev`. */
  stdDevTarget: number;
  /** Used when `targetMode` is `fixed-r`. */
  fixedR: number;
  /** Setups planning less than this reward:risk are not taken. */
  minPlannedR: number;
  /** Take partial profit at this R, or null to run the full position. */
  partialAtR: number | null;
  /** Move the stop to break even once this R is reached, or null to leave it. */
  breakEvenAtR: number | null;

  // ---- Bias and confirmation ------------------------------------------
  biasSource: BiasSource;
  /** Skip setups whose direction fights the bias source. */
  enforceBias: boolean;
  /**
   * Require SMT divergence against a correlated series at the sweep. Only
   * applied when a correlated series is actually supplied.
   */
  requireSmt: boolean;

  // ---- News ------------------------------------------------------------
  /**
   * How a high-impact release on the raid window is handled.
   *   `ignore`       — news is not consulted.
   *   `caution`      — advisories are raised; the setup can still be valid.
   *   `stand-aside`  — a tier-one release (FOMC/CPI/NFP/Fed chair) on the
   *                    window makes the day a no-trade.
   */
  newsPolicy: "ignore" | "caution" | "stand-aside";
  /** Minutes either side of the key open counted as "on" the release. */
  newsBlackoutMinutes: number;
  /** Currencies whose releases can move the instrument being traded. */
  newsCurrencies: string[];

  // ---- Filters ---------------------------------------------------------
  /** ET weekdays the model trades. 1 = Monday. */
  tradingDays: number[];
}

export const DEFAULT_CONFIG: ModelConfig = {
  keyOpen: "10:00",
  contextOpens: { asia: "18:00", midnight: "00:00" },

  accumulationStart: "09:30",
  accumulationEnd: "10:00",
  manipulationEnd: "10:30",
  displacementEnd: "11:30",
  entryCutoff: "12:00",
  flattenAt: "16:00",

  swingStrength: 2,
  equalLevelTolerance: 0.0005,
  minPoolWeight: 2,
  includeKeyLevelsAsPools: true,

  minSweepPenetration: 0.02,
  rangeBasis: "wick",
  requireCloseBackInside: true,
  sweepReclaimBars: 3,

  minDisplacementAtr: 1.5,
  atrPeriod: 14,
  requireFvg: true,
  requireKeyOpenReclaim: true,
  requireMss: false,
  maxDisplacementCandles: 3,

  entryMode: "fvg-proximal",
  allowInverseFvg: true,
  requirePremiumDiscount: false,

  stopBufferAtr: 0.25,
  targetMode: "opposing-liquidity",
  stdDevTarget: -2.0,
  fixedR: 2,
  minPlannedR: 2,
  partialAtR: null,
  breakEvenAtR: null,

  biasSource: "sweep-only",
  enforceBias: false,
  requireSmt: false,

  newsPolicy: "caution",
  newsBlackoutMinutes: 5,
  newsCurrencies: ["USD"],

  tradingDays: [1, 2, 3, 4, 5],
};

/**
 * Rule-by-rule provenance. Kept in lockstep with `ModelConfig` — the test suite
 * asserts every config key has a note and every note names a real key.
 */
export const RULE_NOTES: RuleNote[] = [
  {
    id: "keyOpen",
    confidence: "sourced",
    note: "10:00 ET opens a new 4-hour candle and anchors the 10am Power of 3. This is the model's defining level.",
  },
  {
    id: "contextOpens",
    confidence: "sourced",
    note: "Powell's key opens are described as 18:00, 00:00 and 10:00 ET. The first two frame bias and supply targets.",
  },
  {
    id: "accumulationStart",
    confidence: "inferred",
    note: "The 09:30 cash open starts the range the 10am leg raids. Not stated explicitly in public material.",
  },
  {
    id: "accumulationEnd",
    confidence: "inferred",
    note: "Accumulation closes at the key open itself, by construction of PO3.",
  },
  {
    id: "manipulationEnd",
    confidence: "tunable",
    note: "A 30-minute manipulation window is convention, not a published number. Prime candidate for the parameter search.",
  },
  {
    id: "displacementEnd",
    confidence: "tunable",
    note: "Bounds how long distribution may take to confirm. Longer windows admit more but weaker setups.",
  },
  {
    id: "entryCutoff",
    confidence: "tunable",
    note: "Stops a stale setup filling into the lunch-hour drift.",
  },
  {
    id: "flattenAt",
    confidence: "inferred",
    note: "Intraday model; positions are not carried overnight.",
  },
  {
    id: "swingStrength",
    confidence: "tunable",
    note: "Fractal width. Wider finds fewer, more meaningful swings and lags more before confirming them.",
  },
  {
    id: "equalLevelTolerance",
    confidence: "tunable",
    note: "How close two extremes must be to count as equal highs/lows. Exact ticks are rare; demanding them finds nothing.",
  },
  {
    id: "minPoolWeight",
    confidence: "tunable",
    note: "Raising this restricts the model to raids on genuinely significant pools.",
  },
  {
    id: "includeKeyLevelsAsPools",
    confidence: "sourced",
    note: "Prior-day and session extremes are described as primary liquidity draws, not merely context.",
  },
  {
    id: "minSweepPenetration",
    confidence: "tunable",
    note: "Separates a genuine raid from a one-tick graze of the level.",
  },
  {
    id: "sweepReclaimBars",
    confidence: "tunable",
    note:
      "How long the rejection is allowed to take. Was effectively hard-coded to 1 " +
      "— the candle printing the extreme had to close back inside itself, the " +
      "strictest reading available. Raised to 3 on the strength of the journal: " +
      "four of eleven reviewed days were rejected with the identical reason " +
      "'closed through the opening range low', and a real trader taking this " +
      "setup several times a week cannot be seeing that much one-sided " +
      "expansion. A raid commonly runs push / probe / reclaim across two or " +
      "three candles. NOT measured — 3 is a judgement, and the backtest across " +
      "1..5 is what should set it.",
  },
  {
    id: "rangeBasis",
    confidence: "inferred",
    note:
      "Wicks or bodies for the 09:30-10:00 range. Published PO3 descriptions " +
      "define the zone by bodies and treat wicks as noise; this engine was " +
      "built on wicks. The difference is the largest single lever found so far: " +
      "on both days measured by pixel from screenshots the window raided nothing " +
      "under wick and raided under body. Default stays 'wick' because that is " +
      "what everything else was built and reviewed against, NOT because it has " +
      "been shown to be right. Settle it with a backtest both ways, watching the " +
      "rejection mix as much as expectancy — if bodies mainly convert " +
      "'manipulation' rejections into losses, wicks were filtering usefully.",
  },
  {
    id: "requireCloseBackInside",
    confidence: "sourced",
    note: "A sweep is only manipulation if price rejects it. Trading through and closing through is expansion, not a raid.",
  },
  {
    id: "minDisplacementAtr",
    confidence: "sourced",
    note: "Displacement is defined as a fast, energetic move; ATR units make 'energetic' testable.",
  },
  {
    id: "atrPeriod",
    confidence: "tunable",
    note: "Normalisation window for the energy test.",
  },
  {
    id: "requireFvg",
    confidence: "sourced",
    note: "Displacement that leaves a fair value gap supplies the entry. Without a gap there is nothing to retrace into.",
  },
  {
    id: "requireKeyOpenReclaim",
    confidence: "sourced",
    note: "Distribution is confirmed by displacing back through the key open — the sweep on one side, the trade on the other.",
  },
  {
    id: "requireMss",
    confidence: "sourced",
    note: "An MSS is a CHoCH carried by displacement. Requiring it is stricter than requiring displacement alone.",
  },
  {
    id: "maxDisplacementCandles",
    confidence: "tunable",
    note: "A real expansion leg is often two or three bars rather than one outsized bar.",
  },
  {
    id: "entryMode",
    confidence: "tunable",
    note: "Genuine fill-rate/risk trade-off: proximal fills most, distal and OTE risk least. 'confluence' demands gap and OTE overlap.",
  },
  {
    id: "allowInverseFvg",
    confidence: "inferred",
    note: "Inverted gaps are the standard fallback entry when no fresh imbalance remains.",
  },
  {
    id: "requirePremiumDiscount",
    confidence: "sourced",
    note: "Buy in discount, sell in premium, measured against the leg being dealt in.",
  },
  {
    id: "stopBufferAtr",
    confidence: "tunable",
    note: "Stops sit beyond the manipulation extreme; the buffer keeps them off the exact tick.",
  },
  {
    id: "targetMode",
    confidence: "sourced",
    note: "Targets belong at structural liquidity — the next opposing pool — rather than arbitrary numbers.",
  },
  {
    id: "stdDevTarget",
    confidence: "sourced",
    note: "ICT projects -1, -2, -2.5 and -4 standard deviations of the manipulation leg as objectives.",
  },
  {
    id: "fixedR",
    confidence: "tunable",
    note: "Used only by the fixed-R variant, kept as a baseline to beat.",
  },
  {
    id: "minPlannedR",
    confidence: "sourced",
    note: "A 1:2 minimum reward:risk filter is the standard floor for this family of models.",
  },
  {
    id: "partialAtR",
    confidence: "tunable",
    note: "Scaling out raises hit rate and lowers expectancy per trade. Worth measuring, not assuming.",
  },
  {
    id: "breakEvenAtR",
    confidence: "tunable",
    note: "Break-even stops convert losses into scratches and winners into scratches too. Measure before adopting.",
  },
  {
    id: "biasSource",
    confidence: "sourced",
    note: "Price above the midnight open reads as premium for the day, below as discount. A daily directional filter.",
  },
  {
    id: "enforceBias",
    confidence: "tunable",
    note: "Whether the bias is a hard filter or merely context recorded on the trade.",
  },
  {
    id: "requireSmt",
    confidence: "sourced",
    note: "SMT divergence between NQ and ES at the swept level is a described confirmation, but needs a second data series.",
  },
  {
    id: "newsPolicy",
    confidence: "inferred",
    note: "News handling is an addition, not something any reachable description of Powell's model covers. The reasoning is ICT's: a release is the vehicle that delivers the raid, not a direction signal — but a repricing event replaces the model's premise rather than fuelling it.",
  },
  {
    id: "newsBlackoutMinutes",
    confidence: "tunable",
    note: "How wide a window around the key open counts as 'on the release'. Five minutes covers the candle that prints both sides before settling.",
  },
  {
    id: "newsCurrencies",
    confidence: "inferred",
    note: "Only releases in the instrument's own currency are treated as relevant; USD for the index futures this model is written for.",
  },
  {
    id: "tradingDays",
    confidence: "inferred",
    note: "Weekdays only; this is an RTH intraday model.",
  },
];

/** Merge a partial override onto the defaults. */
export function makeConfig(overrides: Partial<ModelConfig> = {}): ModelConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/** Look up the provenance note for a config key. */
export function noteFor(id: keyof ModelConfig): RuleNote | null {
  return RULE_NOTES.find((note) => note.id === id) ?? null;
}
