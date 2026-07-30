/**
 * Running more than one model over the same day.
 *
 * The 10am Key Open model was built as *the* model, with `readDay` as the entry
 * point and the whole CLI assuming one answer per date. Adding a second one is
 * not a matter of writing more rules — it is a question of what you do when two
 * models disagree, and that question has a wrong answer that feels right.
 *
 * ## The wrong answer
 *
 * "Two models agreeing is stronger evidence." Usually it is not. Both models
 * here read the same primitives — liquidity, displacement, structure — off the
 * same candles at the same time of day. Signals built from shared inputs are
 * correlated, so agreement mostly means the inputs lined up, not that two
 * independent sources reached the same conclusion. Treating it as confirmation
 * is double-counting one piece of evidence.
 *
 * What agreement *does* buy is a cheap consistency check: if two encodings of
 * "the market is being manipulated here" disagree, at least one is misreading
 * the day, and that is worth knowing before risking anything on either.
 *
 * ## The default this file takes
 *
 * On a direction conflict, `stand-aside`. Not "pick the stronger one" and not
 * "take the one with better R" — those are ways of always finding a trade, and
 * a system that always finds a trade has stopped filtering. Override it
 * deliberately with `onConflict` if you have measured something better.
 *
 * ## The arithmetic nobody wants to hear
 *
 * Two models produce roughly twice the setups. If neither has a demonstrated
 * edge, that is twice the chances to be wrong, not twice the opportunity. The
 * 10am model currently stands at one valid setup in eleven reviewed days with no
 * backtest behind it. Adding a second model to that does not make the system
 * smarter; it makes it busier. The scan exists so both can be *measured*
 * together, which is the only route to knowing whether either belongs.
 */

import type { Candle, Direction } from "../types.js";
import type { ModelConfig } from "../spec.js";
import type { ReadOptions, Setup } from "../model.js";

/** What a model concluded about one date. */
export interface ModelRead {
  modelId: string;
  modelName: string;
  status: "setup" | "rejected" | "unavailable";
  /** Fixed by the model's own logic; absent when nothing fired. */
  direction?: Direction;
  setup?: Setup;
  /** Named gate or reason, in the model's own words. */
  reason?: string;
}

/**
 * A model this project can run.
 *
 * Kept deliberately thin. Anything richer would encode the 10am model's shape
 * into the interface and make the second model fight it.
 */
export interface TradingModel {
  id: string;
  name: string;
  /**
   * Where the rules came from, carried at runtime rather than left in a README.
   *
   * `docs/08-sources.md` exists because a reconstructed model that forgets it
   * was reconstructed becomes folklore within a month. A model with no source
   * material must say so here and refuse to run, rather than quietly returning
   * "no setup" and looking like a working filter.
   */
  provenance: {
    status: "reconstructed" | "sourced" | "unavailable";
    note: string;
  };
  read(
    candles: Candle[],
    date: string,
    config: ModelConfig,
    options?: ReadOptions,
  ): ModelRead;
}

export type ConflictPolicy = "stand-aside" | "report-both";

export interface ScanResult {
  date: string;
  reads: ModelRead[];
  /** Models that produced a setup. */
  firing: ModelRead[];
  /**
   * - `none` — nothing fired
   * - `single` — exactly one model fired
   * - `agreement` — several fired the same direction (NOT independent proof)
   * - `conflict` — several fired in opposite directions
   */
  outcome: "none" | "single" | "agreement" | "conflict";
  /** What the conflict policy decided to do. */
  action: "no-trade" | "take" | "stand-aside";
  /** Plain-language explanation, safe to print verbatim. */
  summary: string;
  /** Models that could not run at all, e.g. for want of source material. */
  unavailable: ModelRead[];
}

export function scanDay(
  candles: Candle[],
  date: string,
  models: TradingModel[],
  config: ModelConfig,
  options: ReadOptions & { onConflict?: ConflictPolicy } = {},
): ScanResult {
  const reads = models.map((model) => model.read(candles, date, config, options));
  const unavailable = reads.filter((read) => read.status === "unavailable");
  const firing = reads.filter((read) => read.status === "setup");

  const directions = new Set(firing.map((read) => read.direction));
  const outcome: ScanResult["outcome"] =
    firing.length === 0 ? "none"
    : firing.length === 1 ? "single"
    : directions.size === 1 ? "agreement"
    : "conflict";

  const policy = options.onConflict ?? "stand-aside";
  const action: ScanResult["action"] =
    outcome === "none" ? "no-trade"
    : outcome === "conflict" && policy === "stand-aside" ? "stand-aside"
    : "take";

  const names = firing.map((read) => read.modelName).join(" + ");
  const summary =
    outcome === "none"
      ? `No model found a setup. ${reads
          .filter((read) => read.status === "rejected")
          .map((read) => `${read.modelName}: ${read.reason ?? "rejected"}`)
          .join("; ")}`
      : outcome === "single"
        ? `${names} only. A lone signal is exactly as good as that model's own record — running a second model that stayed silent adds nothing to it.`
        : outcome === "agreement"
          ? `${names} agree on ${[...directions][0]}. Both read the same candles with overlapping primitives, so treat this as a consistency check rather than as two independent votes.`
          : `${names} disagree on direction. At least one is misreading the day and there is no way to tell which from here, so the default is to stand aside.`;

  return { date, reads, firing, outcome, action, summary, unavailable };
}
