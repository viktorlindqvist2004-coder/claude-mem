/**
 * Chart verdicts.
 *
 * A screenshot cannot be backtested, but it can be *judged* — provided the
 * judging is done by the same rules the engine runs, rather than improvised
 * prose each time. That is this module's whole purpose:
 *
 *      screenshot ──vision──▶ ChartObservation ──evaluate()──▶ Verdict
 *                            (perception)        (the encoded model)
 *
 * Perception and judgement are deliberately separated. Reading a chart is
 * genuinely uncertain — a small candle's close, an exact price, whether a wick
 * cleared a level by enough — so `ChartObservation` lets every field be
 * unknown, and `evaluate` reports `unknown` gates instead of guessing. An
 * honest "I need one more thing to call this" beats a confident wrong verdict.
 *
 * The gates, and the order they are checked in, mirror `model.ts` exactly. If
 * they ever diverge, the two halves of this project are telling users different
 * things about the same model, so `tests/verdict.test.ts` pins the alignment.
 */

import type { Direction } from "./types.js";
import type { ModelConfig } from "./spec.js";
import { DEFAULT_CONFIG } from "./spec.js";
import { fibPrice, oteZone, premiumDiscount, type DealingRange } from "./primitives/fib.js";
import type { NewsContext } from "./news.js";

// ---------------------------------------------------------------------
// what the eye can extract
// ---------------------------------------------------------------------

export interface ObservedSweep {
  /** Which side was raided. `low` → the model is a buyer. */
  side: "high" | "low";
  /** The price level that was taken. */
  level: number;
  /** Where that level came from, e.g. "opening range low", "prior day low". */
  levelSource?: string;
  /** Furthest price printed during the raid. */
  extreme: number;
  /**
   * Did the sweeping candle close back inside the level?
   * `null` when the chart is too small to tell — this is the single most
   * important thing to establish, so it is never assumed.
   */
  closedBackInside: boolean | null;
  /** ET wall-clock of the raid, e.g. "10:07". */
  timeEt?: string;
}

export interface ObservedDisplacement {
  direction: Direction;
  /** Did it close back through the 10:00 open price? */
  closedThroughKeyOpen: boolean | null;
  /** Did it leave a fair value gap? */
  leftFvg: boolean | null;
  /** Near and far edges of that gap, if readable. */
  fvgProximal?: number;
  fvgDistal?: number;
  /** Furthest price the displacement leg reached. */
  extreme: number;
  /**
   * Body size as a multiple of recent average range. Rarely measurable from a
   * screenshot; when absent the energy gate reports `unknown` rather than
   * passing by default.
   */
  bodyToAtr?: number | null;
  timeEt?: string;
}

export interface ChartObservation {
  instrument?: string;
  timeframe?: string;
  date?: string;

  /** Open price of the 10:00 ET candle. The axis everything is measured against. */
  keyOpenPrice: number | null;
  /** The 09:30–10:00 range. */
  accumulationHigh: number | null;
  accumulationLow: number | null;

  sweep: ObservedSweep | null;
  displacement: ObservedDisplacement | null;

  /** Where price is now, used to say whether the entry is still available. */
  currentPrice?: number;
  /** Liquidity or levels visible above/below, as target candidates. */
  targetCandidates?: { price: number; label: string }[];
  /** Average true range, if the chart shows an ATR study. */
  atr?: number | null;
  /** SMT read against a correlated chart, when a second screenshot was given. */
  smt?: { present: boolean; detail?: string } | null;

  /** Anything the reader could not determine, in plain words. */
  uncertain?: string[];
}

// ---------------------------------------------------------------------
// the verdict
// ---------------------------------------------------------------------

export type GateStatus = "pass" | "fail" | "unknown" | "pending";

export interface GateResult {
  id: string;
  name: string;
  status: GateStatus;
  /** What was observed, in the chart's own terms. */
  evidence: string;
  /** Why this gate exists at all. */
  rationale: string;
}

export interface TradePlan {
  direction: Direction;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  plannedR: number;
  entryLabel: string;
  targetLabel: string;
  /** Whether price has already passed the entry without you. */
  stillAvailable: boolean | null;
  /** Assumptions made because the chart did not supply a value. */
  assumptions: string[];
}

export type VerdictStatus =
  /** Every gate passed. The setup is valid. */
  | "valid"
  /** A gate failed. There is no trade, and the reason is specific. */
  | "invalid"
  /** Gates so far pass but the sequence has not finished. Wait for a named thing. */
  | "forming"
  /** Something needed could not be read. Ask for it rather than guess. */
  | "uncertain";

export interface Verdict {
  status: VerdictStatus;
  /** One line: what to do. */
  action: string;
  /** Why, in the model's terms. */
  reasoning: string[];
  gates: GateResult[];
  plan: TradePlan | null;
  /** What to supply to turn an `uncertain` into a firm answer. */
  missing: string[];
  /** News context, when a calendar was supplied. */
  news: NewsContext | null;
}

// ---------------------------------------------------------------------

/**
 * Judge an observation against the encoded model.
 *
 * Never throws: an unreadable chart is a normal input and produces an
 * `uncertain` verdict naming what is missing.
 */
export function evaluate(
  observation: ChartObservation,
  config: ModelConfig = DEFAULT_CONFIG,
  news: NewsContext | null = null,
): Verdict {
  const gates: GateResult[] = [];
  const missing: string[] = [...(observation.uncertain ?? [])];

  // ---- Gate 0: the calendar -------------------------------------------
  //
  // First, because it colours how much the later gates can be trusted. A raid
  // delivered by a release is still a raid; a raid that is actually the market
  // repricing is not, and no amount of chart reading separates them.
  if (config.newsPolicy !== "ignore") {
    if (news === null) {
      gates.push({
        id: "news",
        name: "Calendar checked",
        status: "unknown",
        evidence: "no economic calendar was supplied",
        rationale:
          "10:00 ET is a common US release slot. An unchecked calendar is a real risk, not a neutral default.",
      });
      missing.push("the ForexFactory calendar for this date (paste it, or send a screenshot)");
    } else {
      const blocking = news.advisories.filter((advisory) => advisory.severity === "block");
      gates.push({
        id: "news",
        name: "Calendar clear enough to trade",
        status: blocking.length > 0 ? "fail" : "pass",
        evidence:
          news.regime === "clear"
            ? "no high-impact releases touch the model's windows"
            : news.regime === "elevated"
              ? `elevated: ${describeRelevant(news)}`
              : `blackout: ${describeRelevant(news)}`,
        rationale:
          "A release is the vehicle that delivers the manipulation leg, not a direction signal — but a repricing event replaces the model's premise instead of fuelling it.",
      });
    }
  }

  // ---- Gate 1: the axis ------------------------------------------------
  const hasAxis = observation.keyOpenPrice !== null;
  gates.push({
    id: "key-open",
    name: "10:00 key open identified",
    status: hasAxis ? "pass" : "unknown",
    evidence: hasAxis
      ? `key open at ${fmt(observation.keyOpenPrice as number)}`
      : "the 10:00 candle's open price is not readable",
    rationale:
      "Every other test is measured against this price. The raid sits on one side of it and the trade on the other.",
  });
  if (!hasAxis) missing.push("the open price of the 10:00 ET candle");

  // ---- Gate 1: accumulation -------------------------------------------
  const accHigh = observation.accumulationHigh;
  const accLow = observation.accumulationLow;
  const hasRange = accHigh !== null && accLow !== null && accHigh > accLow;
  const accRange = hasRange ? (accHigh as number) - (accLow as number) : null;
  gates.push({
    id: "accumulation",
    name: "09:30–10:00 range established",
    status: hasRange ? "pass" : "unknown",
    evidence: hasRange
      ? `range ${fmt(accLow as number)} – ${fmt(accHigh as number)} (${fmt(accRange as number)} wide)`
      : "the 09:30–10:00 range is not visible on this chart",
    rationale:
      "This range holds the stops the raid goes after, and its width is the yardstick for judging whether a raid was meaningful.",
  });
  if (!hasRange) missing.push("the 09:30–10:00 high and low (scroll left so the cash open is visible)");

  // ---- Gate 2: manipulation -------------------------------------------
  const sweep = observation.sweep;
  if (!sweep) {
    gates.push({
      id: "manipulation",
      name: "Liquidity raid",
      status: "pending",
      evidence: "no raid of either side visible yet",
      rationale:
        "The model has no direction until one side is taken. Without a raid there is nothing to trade away from.",
    });
    return assemble(gates, null, missing, observation, config, news);
  }

  const penetration = sweep.side === "high" ? sweep.extreme - sweep.level : sweep.level - sweep.extreme;
  const required = accRange !== null ? accRange * config.minSweepPenetration : null;
  const penetrationOk = required === null ? null : penetration >= required;

  gates.push({
    id: "penetration",
    name: "Raid cleared the level meaningfully",
    status: penetrationOk === null ? "unknown" : penetrationOk ? "pass" : "fail",
    evidence:
      required === null
        ? `cleared ${sweep.levelSource ?? "the level"} by ${fmt(penetration)}, but the range is unknown so there is nothing to scale it against`
        : `cleared ${sweep.levelSource ?? "the level"} by ${fmt(penetration)} — threshold is ${fmt(required)} (${(config.minSweepPenetration * 100).toFixed(0)}% of the range)`,
    rationale:
      "A one-tick graze fills almost no resting orders. The threshold scales with the range so it adapts to a quiet or a violent morning.",
  });

  gates.push({
    id: "rejection",
    name: "Raid was rejected, not continued",
    status: sweep.closedBackInside === null ? "unknown" : sweep.closedBackInside ? "pass" : "fail",
    evidence:
      sweep.closedBackInside === null
        ? "cannot tell whether the sweeping candle closed back inside the level"
        : sweep.closedBackInside
          ? `closed back inside ${sweep.levelSource ?? "the level"} — orders filled and price rejected`
          : `closed through ${sweep.levelSource ?? "the level"} — this is expansion, not a raid`,
    rationale:
      "This is the distinction the whole model rests on. Closing through the level means whoever fades it is on the wrong side.",
  });
  if (sweep.closedBackInside === null) {
    missing.push("whether the sweeping candle CLOSED back inside the level (zoom in on it)");
  }

  // Direction is fixed by the raid and cannot be revisited.
  const direction: Direction = sweep.side === "low" ? "long" : "short";

  if (sweep.closedBackInside === false) {
    return assemble(gates, null, missing, observation, config, news);
  }

  // ---- Gate 3: distribution -------------------------------------------
  const displacement = observation.displacement;
  if (!displacement) {
    gates.push({
      id: "distribution",
      name: "Displacement back through the key open",
      status: "pending",
      evidence: `raid of the ${sweep.side}s is in, but price has not displaced back through the key open yet`,
      rationale:
        "The raid alone is not a signal. Displacement is the evidence that the reversal is real rather than a drift.",
    });
    return assemble(gates, null, missing, observation, config, news, direction);
  }

  const directionOk = displacement.direction === direction;
  gates.push({
    id: "direction",
    name: "Displacement runs away from the raid",
    status: directionOk ? "pass" : "fail",
    evidence: directionOk
      ? `raid of the ${sweep.side}s → ${direction}, and the displacement is ${displacement.direction}`
      : `raid of the ${sweep.side}s implies ${direction}, but the displacement is ${displacement.direction}`,
    rationale:
      "Direction is set by the raid and never revisited. There is no version of this model where you sweep the lows and sell.",
  });

  gates.push({
    id: "reclaim",
    name: "Closed back through the 10:00 open",
    status:
      !config.requireKeyOpenReclaim
        ? "pass"
        : displacement.closedThroughKeyOpen === null
          ? "unknown"
          : displacement.closedThroughKeyOpen
            ? "pass"
            : "fail",
    evidence:
      displacement.closedThroughKeyOpen === null
        ? "cannot tell whether the displacement closed through the key open"
        : displacement.closedThroughKeyOpen
          ? "displacement closed back through the key open price"
          : "displacement stalled without closing through the key open",
    rationale:
      "This is what makes it the 10am model rather than a generic reversal: the raid on one side of the axis, the trade on the other.",
  });
  if (config.requireKeyOpenReclaim && displacement.closedThroughKeyOpen === null) {
    missing.push("whether the displacement candle closed beyond the 10:00 open price");
  }

  gates.push({
    id: "imbalance",
    name: "Displacement left a fair value gap",
    status:
      !config.requireFvg
        ? "pass"
        : displacement.leftFvg === null
          ? "unknown"
          : displacement.leftFvg
            ? "pass"
            : "fail",
    evidence:
      displacement.leftFvg === null
        ? "cannot tell whether a gap was left"
        : displacement.leftFvg
          ? displacement.fvgProximal !== undefined && displacement.fvgDistal !== undefined
            ? `gap between ${fmt(displacement.fvgDistal)} and ${fmt(displacement.fvgProximal)}`
            : "a gap is visible but its edges are not readable"
          : "no gap — the move overlapped its own candles",
    rationale:
      "The gap is the entry. Without an imbalance to retrace into there is no defined place to get in.",
  });

  gates.push({
    id: "energy",
    name: "Displacement was energetic",
    status:
      displacement.bodyToAtr === null || displacement.bodyToAtr === undefined
        ? "unknown"
        : displacement.bodyToAtr >= config.minDisplacementAtr
          ? "pass"
          : "fail",
    evidence:
      displacement.bodyToAtr === null || displacement.bodyToAtr === undefined
        ? "displacement size relative to recent range is not measurable from the screenshot"
        : `body is ${displacement.bodyToAtr.toFixed(2)}× ATR against a ${config.minDisplacementAtr}× floor`,
    rationale:
      "'Fast and aggressive' has to be measurable or it becomes a feeling. A slow crawl back over the line is not a reclaim.",
  });
  if (displacement.bodyToAtr === null || displacement.bodyToAtr === undefined) {
    // Judged visually rather than blocking: a screenshot rarely carries an ATR.
    missing.push("an ATR reading, if you want the energy test decided numerically rather than by eye");
  }

  // ---- Gate 4: the plan ------------------------------------------------
  const plan = buildPlan(observation, sweep, displacement, direction, accRange, config);

  gates.push({
    id: "reward",
    name: `Reward:risk clears the ${config.minPlannedR}R floor`,
    status: plan === null ? "unknown" : plan.plannedR >= config.minPlannedR ? "pass" : "fail",
    evidence:
      plan === null
        ? "not enough readable prices to compute entry, stop and target"
        : `${plan.plannedR.toFixed(2)}R planned — entry ${fmt(plan.entryPrice)}, stop ${fmt(plan.stopPrice)}, target ${fmt(plan.targetPrice)}`,
    rationale:
      "This filter removes the deep-raid, close-draw days, which are systematically the poor instances.",
  });

  return assemble(gates, plan, missing, observation, config, news, direction);
}

// ---------------------------------------------------------------------

function buildPlan(
  observation: ChartObservation,
  sweep: ObservedSweep,
  displacement: ObservedDisplacement,
  direction: Direction,
  accRange: number | null,
  config: ModelConfig,
): TradePlan | null {
  const assumptions: string[] = [];

  const range: DealingRange = {
    from: sweep.extreme,
    to: displacement.extreme,
    direction,
  };
  const ote = oteZone(range);

  // ---- Entry ----------------------------------------------------------
  let entryPrice: number | null = null;
  let entryLabel = "";

  const hasGap = displacement.fvgProximal !== undefined && displacement.fvgDistal !== undefined;
  switch (config.entryMode) {
    case "fvg-proximal":
      if (hasGap) {
        entryPrice = displacement.fvgProximal as number;
        entryLabel = "FVG proximal";
      }
      break;
    case "fvg-ce":
      if (hasGap) {
        entryPrice = ((displacement.fvgProximal as number) + (displacement.fvgDistal as number)) / 2;
        entryLabel = "FVG consequent encroachment";
      }
      break;
    case "fvg-distal":
      if (hasGap) {
        entryPrice = displacement.fvgDistal as number;
        entryLabel = "FVG distal";
      }
      break;
    case "ote-start":
      entryPrice = ote.start;
      entryLabel = "OTE 62%";
      break;
    case "confluence":
      if (hasGap) {
        const gapTop = Math.max(displacement.fvgProximal as number, displacement.fvgDistal as number);
        const gapBottom = Math.min(displacement.fvgProximal as number, displacement.fvgDistal as number);
        const oteTop = Math.max(ote.start, ote.end);
        const oteBottom = Math.min(ote.start, ote.end);
        const top = Math.min(gapTop, oteTop);
        const bottom = Math.max(gapBottom, oteBottom);
        if (top >= bottom) {
          entryPrice = direction === "long" ? top : bottom;
          entryLabel = "FVG ∩ OTE";
        }
      }
      break;
    case "ote-sweet":
    default:
      entryPrice = ote.sweet;
      entryLabel = "OTE 70.5%";
      break;
  }

  // Fall back to the OTE sweet spot when the gap's edges were not readable —
  // it needs only the two extremes, which are the easiest prices to read.
  if (entryPrice === null) {
    entryPrice = ote.sweet;
    entryLabel = "OTE 70.5%";
    assumptions.push(
      `the gap's edges were not readable, so the entry falls back to the OTE sweet spot instead of ${config.entryMode}`,
    );
  }

  // ---- Stop -----------------------------------------------------------
  let buffer: number;
  if (observation.atr !== null && observation.atr !== undefined) {
    buffer = observation.atr * config.stopBufferAtr;
  } else if (accRange !== null) {
    buffer = accRange * 0.02;
    assumptions.push(
      "no ATR was available, so the stop buffer is 2% of the 09:30–10:00 range rather than a fraction of ATR",
    );
  } else {
    buffer = Math.abs(displacement.extreme - sweep.extreme) * 0.02;
    assumptions.push("no ATR or range was available, so the stop buffer is 2% of the manipulation leg");
  }

  const stopPrice = direction === "long" ? sweep.extreme - buffer : sweep.extreme + buffer;
  const risk = Math.abs(entryPrice - stopPrice);
  if (risk <= 0) return null;

  // ---- Target ---------------------------------------------------------
  const side: "high" | "low" = direction === "long" ? "high" : "low";
  const candidates = (observation.targetCandidates ?? [])
    .filter((candidate) =>
      side === "high" ? candidate.price > (entryPrice as number) : candidate.price < (entryPrice as number),
    )
    .sort((a, b) => (side === "high" ? a.price - b.price : b.price - a.price));

  let targetPrice: number;
  let targetLabel: string;
  const nearest = candidates[0];

  if (nearest && config.targetMode !== "std-dev" && config.targetMode !== "fixed-r") {
    targetPrice = nearest.price;
    targetLabel = nearest.label;
  } else if (config.targetMode === "fixed-r") {
    targetPrice = direction === "long" ? entryPrice + risk * config.fixedR : entryPrice - risk * config.fixedR;
    targetLabel = `fixed ${config.fixedR}R`;
  } else {
    targetPrice = fibPrice(range, config.stdDevTarget);
    targetLabel = `${config.stdDevTarget} std dev projection`;
    if (!nearest && config.targetMode === "opposing-liquidity") {
      assumptions.push(
        "no opposing liquidity was marked on the chart, so the target falls back to the standard deviation projection",
      );
    }
  }

  const plannedR = Math.abs(targetPrice - entryPrice) / risk;

  // ---- Is it still on the table? --------------------------------------
  //
  // The entry is a limit sitting *behind* price: for a long it is below the
  // current price and waits for the pullback. So "still available" means the
  // retracement has not arrived yet, and `false` means the level has already
  // been traded to — you are either in, or it filled without you.
  let stillAvailable: boolean | null = null;
  if (observation.currentPrice !== undefined) {
    stillAvailable =
      direction === "long"
        ? observation.currentPrice > entryPrice
        : observation.currentPrice < entryPrice;

    if (stillAvailable) {
      const distanceR = Math.abs(observation.currentPrice - entryPrice) / risk;
      if (distanceR >= 1) {
        assumptions.push(
          `price is ${distanceR.toFixed(1)}R away from the entry — entering at market here would carry the same stop over a much wider distance, which is chasing, not the model`,
        );
      }
    }
  }

  // Buying in premium (or selling in discount) of the leg is the wrong half.
  const zone = premiumDiscount(range, entryPrice);
  const wanted = direction === "long" ? "discount" : "premium";
  if (zone !== wanted && zone !== "equilibrium") {
    assumptions.push(`the entry sits in ${zone} of the manipulation leg, where the model would rather not ${direction === "long" ? "buy" : "sell"}`);
  }

  return {
    direction,
    entryPrice,
    stopPrice,
    targetPrice,
    plannedR,
    entryLabel,
    targetLabel,
    stillAvailable,
    assumptions,
  };
}

function assemble(
  gates: GateResult[],
  plan: TradePlan | null,
  missing: string[],
  observation: ChartObservation,
  config: ModelConfig,
  news: NewsContext | null,
  direction?: Direction,
): Verdict {
  const failed = gates.filter((gate) => gate.status === "fail");
  // An unchecked calendar qualifies the answer rather than blocking it. The
  // structural read is complete either way, and downgrading every chart-only
  // verdict to "uncertain" would make the common case useless.
  const unknown = gates.filter((gate) => gate.status === "unknown" && gate.id !== "news");
  const pending = gates.filter((gate) => gate.status === "pending");

  const reasoning: string[] = [];
  let status: VerdictStatus;
  let action: string;

  if (failed.length > 0) {
    status = "invalid";
    const first = failed[0] as GateResult;
    action = "No trade.";
    reasoning.push(`${first.name} failed: ${first.evidence}.`);
    reasoning.push(first.rationale);
    for (const gate of failed.slice(1)) {
      reasoning.push(`Also failing — ${gate.name}: ${gate.evidence}.`);
    }
    // The one case where a failure is worse than "no setup".
    if (failed.some((gate) => gate.id === "rejection")) {
      reasoning.push(
        "Treat this as a warning in the opposite direction rather than a missed opportunity: price closing through the level is expansion, and fading it is the most expensive mistake available in this model.",
      );
    }
  } else if (pending.length > 0) {
    status = "forming";
    const next = pending[0] as GateResult;
    action = `Wait. ${waitingFor(next.id, direction)}`;
    reasoning.push(`${next.name} has not happened yet: ${next.evidence}.`);
    reasoning.push(next.rationale);
  } else if (unknown.length > 0) {
    status = "uncertain";
    action = "Cannot call it yet — one or more conditions are not readable from this chart.";
    for (const gate of unknown) {
      reasoning.push(`${gate.name}: ${gate.evidence}.`);
    }
  } else {
    status = "valid";
    if (plan && plan.plannedR < config.minPlannedR) {
      // Defensive: the reward gate should already have failed above.
      status = "invalid";
      action = "No trade — the geometry does not pay.";
      reasoning.push(`Planned ${plan.plannedR.toFixed(2)}R is below the ${config.minPlannedR}R floor.`);
    } else if (plan && plan.stillAvailable === false) {
      status = "valid";
      action = `Valid ${plan.direction}, but price has already traded to the entry at ${fmt(plan.entryPrice)}. If you are not already in, let this one go.`;
      reasoning.push(
        "The read was correct and the level has been reached. Entering now means a worse price against the same stop at the raid extreme, which quietly widens your risk beyond what the plan was sized for.",
      );
      reasoning.push(
        `The stop remains ${fmt(plan.stopPrice)} and the target ${fmt(plan.targetPrice)} — if you are in from ${fmt(plan.entryPrice)}, nothing about the plan changes.`,
      );
    } else {
      action = plan
        ? `Valid ${plan.direction}. Work a limit at ${fmt(plan.entryPrice)} (${plan.entryLabel}), stop ${fmt(plan.stopPrice)}, target ${fmt(plan.targetPrice)} (${plan.targetLabel}) — ${plan.plannedR.toFixed(2)}R.`
        : "Valid setup.";
      // A structurally valid setup delivered by a release is still valid, but
      // saying so without the qualifier would be the wrong headline.
      if (news?.regime === "blackout") {
        action += " Structurally valid, but it is a news-driven raid — size accordingly and wait for the release candle to close before acting.";
      }
      reasoning.push(
        `Every gate passed: the ${observation.sweep?.side === "low" ? "lows" : "highs"} were raided and rejected, and price displaced back through the 10:00 open leaving an imbalance to enter on.`,
      );
      reasoning.push(
        "The stop sits beyond the raid extreme because that price is the premise — if it trades through, the idea that the raid was a liquidity grab is simply false and there is nothing left to be in the trade for.",
      );
    }
  }

  if (plan) {
    for (const assumption of plan.assumptions) {
      reasoning.push(`Assumption: ${assumption}.`);
    }
  }

  // News advisories go last so the chart reasoning stands on its own first,
  // then gets qualified. A blocking advisory has already failed the gate above,
  // so this only adds the explanation.
  if (news) {
    for (const advisory of news.advisories) {
      reasoning.push(advisory.severity === "note" ? advisory.message : `⚠ ${advisory.message}`);
    }
  } else if (config.newsPolicy !== "ignore" && status !== "invalid") {
    action += " Calendar not checked — confirm before acting.";
    reasoning.push(
      "⚠ No economic calendar was supplied. 10:00 ET is a common US release slot, and a raid delivered by a release needs the release candle to close before the rejection test means anything. Send the ForexFactory calendar for this date if it matters.",
    );
  }

  return {
    status,
    action,
    reasoning,
    gates,
    plan,
    missing: [...new Set(missing)],
    news,
  };
}

/** One line naming the releases that matter, for the gate's evidence field. */
function describeRelevant(news: NewsContext): string {
  const notable = news.relevant.filter(
    (event) => event.impact === "high" || event.impact === "holiday",
  );
  if (notable.length === 0) return "no relevant high-impact releases";
  return notable
    .slice(0, 4)
    .map((event) => `${event.timeEt ?? "all day"} ${event.title}`)
    .join(", ");
}

function waitingFor(gateId: string, direction?: Direction): string {
  if (gateId === "manipulation") {
    return "Neither side has been raided. Mark the 09:30–10:00 high and low and the 10:00 open, then wait for price to take one of them and reject.";
  }
  if (gateId === "distribution") {
    const way = direction === "long" ? "upward" : direction === "short" ? "downward" : "";
    return `The raid is in and direction is set${direction ? ` (${direction})` : ""}. Now wait for an energetic ${way} move that closes back through the 10:00 open and leaves a gap. Until that prints there is no signal.`;
  }
  return "The sequence has not completed.";
}

function fmt(value: number): string {
  return value.toFixed(2);
}
