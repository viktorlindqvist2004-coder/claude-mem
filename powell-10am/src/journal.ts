/**
 * The journal.
 *
 * This project's memory lives on disk, not in anyone's head. A review session
 * starts by reading `journal/entries.jsonl` and `journal/OBSERVATIONS.md`, and
 * ends by appending to them. Nothing carries over any other way — an assistant
 * reviewing charts next week begins with no recollection of this week, so an
 * observation that is not written down is an observation that did not happen.
 *
 * Two files, two jobs:
 *
 *   entries.jsonl      One line per day reviewed: the verdict, which gate
 *                      stopped it, the plan, and what actually happened.
 *                      Append-only, so the record cannot be quietly revised
 *                      after an outcome is known.
 *
 *   OBSERVATIONS.md    The running list of candidate improvements, each with
 *                      the evidence behind it and a status. Prose, because the
 *                      reasoning matters as much as the conclusion.
 *
 * The point of the split: entries accumulate toward a sample worth believing,
 * observations accumulate toward changes worth testing. Conflating them is how
 * a model gets "improved" one loss at a time.
 */

import type { VerdictStatus } from "./verdict.js";

export interface JournalOutcome {
  /** What became of the trade. `not-taken` when the reader stood aside. */
  result: "target" | "stop" | "timeout" | "no-fill" | "not-taken";
  /** Realised result in units of initial risk. */
  r?: number;
  note?: string;
}

export interface JournalEntry {
  /** ET trading date reviewed, `YYYY-MM-DD`. */
  date: string;
  instrument: string;
  status: VerdictStatus;
  /** The gate that stopped it, when one did. */
  failedGate?: string;
  /** Short reason, in the engine's own words. */
  reason?: string;
  keyOpen: number | null;
  range: { high: number; low: number } | null;
  plan?: {
    direction: "long" | "short";
    entry: number;
    stop: number;
    target: number;
    plannedR: number;
  };
  outcome?: JournalOutcome;
  /**
   * How the reading was obtained, because it bounds how much the entry is
   * worth: prices read off an axis are not prices read off an OHLC readout.
   *
   *   screenshot  eyeballed against the price axis. Gets ranges roughly right
   *               and gets the relationships between individual candles wrong —
   *               see the 10 Jul 2026 entry, where an axis read had a wick
   *               clearing a level that it actually fell 3.4 points short of.
   *   pixel       measured with `scripts/chart-measure.ts`. Accurate to about a
   *               pixel, which the tool states in points for that chart.
   *   hover       from TradingView's OHLC readout. Exact.
   *   data        from a CSV. Exact, and the only source a backtest can use.
   */
  source: "screenshot" | "pixel" | "hover" | "data";
  /** ISO timestamp of when the review happened. */
  reviewedAt: string;
  notes?: string[];
}

export interface JournalStats {
  daysReviewed: number;
  setups: number;
  taken: number;
  wins: number;
  losses: number;
  scratches: number;
  totalR: number;
  /** Mean R per taken trade. Meaningless below ~100 trades; reported anyway. */
  expectancy: number;
  setupRate: number;
  /** Which gate declined each day, most frequent first. */
  rejections: { gate: string; count: number }[];
  /** How many entries rest on axis-read prices rather than exact ones. */
  sourceMix: { source: string; count: number }[];
  /** Plain-language caveat sized to the sample. */
  confidence: string;
}

// ---------------------------------------------------------------------

/** Parse a JSONL journal, skipping blank lines. Malformed lines throw. */
export function parseJournal(text: string): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (line.length === 0 || line.startsWith("//")) continue;
    try {
      entries.push(JSON.parse(line) as JournalEntry);
    } catch {
      throw new Error(`journal line ${i + 1} is not valid JSON: ${line.slice(0, 80)}`);
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function serialiseEntry(entry: JournalEntry): string {
  return JSON.stringify(entry);
}

/**
 * Summarise the journal.
 *
 * Deliberately reports the denominator and a confidence caveat alongside every
 * headline number — a journal is where a five-day run gets mistaken for an edge,
 * and the only defence is making the sample size impossible to miss.
 */
export function summariseJournal(entries: JournalEntry[]): JournalStats {
  const setups = entries.filter((entry) => entry.status === "valid");
  const taken = entries.filter(
    (entry) => entry.outcome && entry.outcome.result !== "not-taken" && entry.outcome.result !== "no-fill",
  );

  const rWith = (entry: JournalEntry) => entry.outcome?.r ?? 0;
  const wins = taken.filter((entry) => rWith(entry) > 0);
  const losses = taken.filter((entry) => rWith(entry) < 0);
  const scratches = taken.filter((entry) => rWith(entry) === 0);
  const totalR = taken.reduce((sum, entry) => sum + rWith(entry), 0);

  const gateCounts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status === "valid") continue;
    const gate = entry.failedGate ?? entry.status;
    gateCounts.set(gate, (gateCounts.get(gate) ?? 0) + 1);
  }

  const sourceCounts = new Map<string, number>();
  for (const entry of entries) {
    sourceCounts.set(entry.source, (sourceCounts.get(entry.source) ?? 0) + 1);
  }

  return {
    daysReviewed: entries.length,
    setups: setups.length,
    taken: taken.length,
    wins: wins.length,
    losses: losses.length,
    scratches: scratches.length,
    totalR: round(totalR),
    expectancy: taken.length > 0 ? round(totalR / taken.length) : 0,
    setupRate: entries.length > 0 ? round(setups.length / entries.length) : 0,
    rejections: [...gateCounts.entries()]
      .map(([gate, count]) => ({ gate, count }))
      .sort((a, b) => b.count - a.count),
    sourceMix: [...sourceCounts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    confidence: confidenceFor(taken.length),
  };
}

/**
 * The caveat that belongs next to every number above.
 *
 * Thresholds are blunt on purpose: the difference between 8 trades and 30 is
 * not a matter of degree, and a journal that reports expectancy without saying
 * which side of that line it is on is actively misleading.
 */
function confidenceFor(taken: number): string {
  if (taken === 0) return "No trades taken yet. Nothing here is a result.";
  if (taken < 10) {
    return `${taken} trade${taken === 1 ? "" : "s"}. This is an anecdote, not a sample — a single winner proves no more than a single loser would.`;
  }
  if (taken < 30) {
    return `${taken} trades. Still far too few to conclude anything; expect the numbers to move a lot.`;
  }
  if (taken < 100) {
    return `${taken} trades. Enough to form a hypothesis, not enough to trust it. Compare against a walk-forward before believing the expectancy.`;
  }
  return `${taken} trades. A usable sample. Check it against docs/06 for how to read the figures honestly.`;
}

function round(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}
