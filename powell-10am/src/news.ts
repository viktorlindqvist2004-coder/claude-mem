/**
 * The news layer.
 *
 * 10:00 ET is not an arbitrary time — it is also when a large block of US data
 * releases. ISM, JOLTS, consumer confidence and revised UMich all land exactly
 * on the key open. That means the model's central test, "was this a liquidity
 * raid or is price genuinely repricing?", is at its hardest precisely when the
 * model is looking for an answer.
 *
 * PHILOSOPHY. News does not invert the model and does not supply direction.
 * The ICT framing this sits inside treats a high-impact release as the
 * *delivery mechanism* for the manipulation leg — the raid needs a reason for
 * price to move violently through a level, and the release is that reason. So
 * this layer never says "the number was good, go long". It adjusts how much
 * you can trust the rejection test, and when you should not be in the market.
 *
 * PROVENANCE. This is an addition, requested by the user. Nothing here is
 * attributed to Powell's own material — no public description of his model
 * that could be reached covers news handling. The rules are marked `inferred`
 * or `tunable` in `spec.ts` accordingly, and `docs/13-news.md` says so plainly.
 * Treat this layer as a well-reasoned overlay, not as doctrine.
 */

import { minutesOf } from "./time.js";
import type { ModelConfig } from "./spec.js";

export type NewsImpact = "high" | "medium" | "low" | "holiday";

export interface NewsEvent {
  /** ET wall-clock, `HH:MM`. Null for all-day or tentative entries. */
  timeEt: string | null;
  /** Currency code as the calendar gives it, e.g. `USD`. */
  currency: string;
  impact: NewsImpact;
  title: string;
  actual?: string | null;
  forecast?: string | null;
  previous?: string | null;
  /** True when impact was inferred from the title rather than read from the source. */
  impactInferred?: boolean;
}

/** Where an event falls relative to the model's phases. */
export type NewsPhase =
  /** Before the cash open — shapes the range the raid will target. */
  | "pre-open"
  /** Inside 09:30–10:00 — the accumulation range itself is news-distorted. */
  | "opening-range"
  /** At or within the blackout of 10:00 — the key open is a news candle. */
  | "at-key-open"
  /** Inside the manipulation window. */
  | "manipulation"
  /** Inside the distribution window. */
  | "distribution"
  /** After the entry cutoff but before the flatten — a risk to an open position. */
  | "holding"
  /** Outside anything the model cares about. */
  | "outside";

export interface ClassifiedEvent extends NewsEvent {
  phase: NewsPhase;
  /** Minutes from the key open. Negative means before it. */
  minutesFromKeyOpen: number | null;
  /** Whether this event can move the instrument being traded. */
  relevant: boolean;
}

export type NewsRegime =
  /** Nothing high-impact touches the model's windows. */
  | "clear"
  /** High-impact news shaped the range, or threatens an open position later. */
  | "elevated"
  /** High-impact news lands on or inside the raid window. The premise is confounded. */
  | "blackout";

export interface Advisory {
  id: string;
  /** `warn` is informational; `block` makes the news gate fail. */
  severity: "note" | "warn" | "block";
  message: string;
}

export interface NewsContext {
  regime: NewsRegime;
  events: ClassifiedEvent[];
  advisories: Advisory[];
  /** Events that matter, newest-first ordering preserved from the source. */
  relevant: ClassifiedEvent[];
  /** Set when the calendar itself could not be established. */
  unavailable?: string;
}

/**
 * Titles that are high-impact for index futures regardless of what a calendar's
 * colour coding says. Pasted calendar text carries no impact column, so this is
 * how impact is recovered — see `parseCalendarText`.
 */
const HIGH_IMPACT_PATTERNS: RegExp[] = [
  /non[- ]?farm|nfp\b/i,
  /\bcpi\b|consumer price/i,
  /\bppi\b|producer price/i,
  /\bpce\b/i,
  /fomc|federal funds|rate (decision|statement)|dot plot/i,
  /powell|fed chair|fed president|beige book/i,
  /\bism\b/i,
  /\bgdp\b/i,
  /retail sales/i,
  /jolts|job openings/i,
  /unemployment claims|jobless claims/i,
  /\badp\b/i,
  /consumer confidence|consumer sentiment|uom|umich/i,
  /durable goods/i,
  /\bpmi\b/i,
];

/** The tier where the model's premise is not merely noisy but replaced. */
const TIER_ONE_PATTERNS: RegExp[] = [
  /non[- ]?farm|nfp\b/i,
  /\bcpi\b|consumer price/i,
  /fomc|federal funds|rate (decision|statement)/i,
  /powell|fed chair/i,
];

// ---------------------------------------------------------------------
// sources
// ---------------------------------------------------------------------

/**
 * Fetch the ForexFactory weekly calendar feed.
 *
 * This is the JSON feed the site publishes; it needs outbound network access,
 * which many sandboxes (including the one this project was built in) deny. The
 * failure is returned rather than thrown so callers can fall back to a pasted
 * calendar without special-casing an exception.
 */
export async function fetchForexFactoryWeek(
  url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
): Promise<{ events: NewsEvent[]; error?: string }> {
  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) {
      return { events: [], error: `calendar feed returned HTTP ${response.status}` };
    }
    const raw = (await response.json()) as unknown;
    return { events: parseForexFactoryJson(raw) };
  } catch (error) {
    return {
      events: [],
      error: `could not reach the calendar feed (${(error as Error).message}). Paste the calendar instead — see docs/13-news.md`,
    };
  }
}

/**
 * Parse the feed's JSON shape.
 *
 * Timestamps in the feed are ISO with an offset; the model needs ET wall-clock,
 * so they are converted rather than trusted as-is. A feed row whose date does
 * not match `dateEt` is dropped, because a whole week of events would otherwise
 * be classified against one day's windows.
 */
export function parseForexFactoryJson(raw: unknown, dateEt?: string): NewsEvent[] {
  if (!Array.isArray(raw)) return [];
  const events: NewsEvent[] = [];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;

    const title = typeof row.title === "string" ? row.title : null;
    const currency = typeof row.country === "string" ? row.country : typeof row.currency === "string" ? row.currency : null;
    if (!title || !currency) continue;

    let timeEt: string | null = null;
    let date: string | null = null;
    if (typeof row.date === "string") {
      const parsed = Date.parse(row.date);
      if (!Number.isNaN(parsed)) {
        const et = etParts(parsed);
        timeEt = et.time;
        date = et.date;
      }
    }
    if (dateEt && date && date !== dateEt) continue;

    events.push({
      timeEt,
      currency,
      impact: normaliseImpact(row.impact),
      title,
      actual: asText(row.actual),
      forecast: asText(row.forecast),
      previous: asText(row.previous),
    });
  }

  return events;
}

/**
 * Parse a calendar pasted as text.
 *
 * The realistic path: the feed is unreachable, so the user copies the rows from
 * the site or reads them off a screenshot. Impact colour does not survive a
 * copy-paste, so it is recovered from the title against `HIGH_IMPACT_PATTERNS`
 * and the row is flagged `impactInferred` — the verdict says when it is relying
 * on a guess rather than a stated impact.
 *
 * Accepted shapes, one event per line:
 *   10:00am  USD  ISM Manufacturing PMI  48.5  48.3  48.4
 *   8:30am USD Core CPI m/m
 *   All Day USD Bank Holiday
 *   14:00 USD FOMC Statement            (24h times are fine too)
 */
export function parseCalendarText(text: string): NewsEvent[] {
  const events: NewsEvent[] = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    // Skip day headers like "Tue Mar 10" that carry no currency.
    if (!/[A-Z]{3}/.test(trimmed)) continue;

    const timeMatch = /^(\d{1,2}:\d{2}\s*(?:am|pm)?|all\s*day|tentative)/i.exec(trimmed);
    let rest = trimmed;
    let timeEt: string | null = null;

    if (timeMatch) {
      const rawTime = (timeMatch[1] as string).trim();
      timeEt = /all\s*day|tentative/i.test(rawTime) ? null : to24Hour(rawTime);
      rest = trimmed.slice(timeMatch[0].length).trim();
    }

    const currencyMatch = /^([A-Z]{3})\b/.exec(rest);
    if (!currencyMatch) continue;
    const currency = currencyMatch[1] as string;
    rest = rest.slice(currency.length).trim();

    // An explicit impact marker, if the user added one.
    let impact: NewsImpact | null = null;
    // A lookahead rather than \b: `!!` is followed by a space, and two
    // non-word characters never form a word boundary.
    const impactMatch = /^(?:\[)?(high|medium|med|low|holiday|!{1,3})(?:\])?(?=\s|$)/i.exec(rest);
    if (impactMatch) {
      impact = markerToImpact(impactMatch[1] as string);
      rest = rest.slice(impactMatch[0].length).trim();
    }

    if (rest.length === 0) continue;
    const { title, actual, forecast, previous } = splitTitleAndValues(rest);
    if (title.length === 0) continue;

    events.push({
      timeEt,
      currency,
      impact: impact ?? inferImpact(title),
      title,
      actual,
      forecast,
      previous,
      ...(impact === null ? { impactInferred: true } : {}),
    });
  }

  return events;
}

// ---------------------------------------------------------------------
// classification
// ---------------------------------------------------------------------

/**
 * Classify a day's events against the model's windows and derive the regime
 * and the advisories that follow from it.
 */
export function buildNewsContext(
  events: NewsEvent[],
  config: ModelConfig,
  options: { unavailable?: string } = {},
): NewsContext {
  const keyOpen = minutesOf(config.keyOpen);
  const classified = events.map((event) => classify(event, config));
  const relevant = classified.filter((event) => event.relevant);

  const advisories: Advisory[] = [];
  let regime: NewsRegime = "clear";

  if (options.unavailable) {
    advisories.push({
      id: "calendar-unavailable",
      severity: "warn",
      message: `The calendar could not be established (${options.unavailable}). 10:00 ET is a common release slot, so an unchecked calendar is a real risk rather than a neutral default — confirm before trading.`,
    });
  }

  const atOpen = relevant.filter((event) => event.phase === "at-key-open" || event.phase === "manipulation");
  const highAtOpen = atOpen.filter((event) => event.impact === "high");
  const tierOneAtOpen = highAtOpen.filter((event) => isTierOne(event.title));

  // ---- Blackout: the raid window is a news window ----------------------
  if (highAtOpen.length > 0) {
    regime = "blackout";
    const names = highAtOpen.map((event) => `${event.timeEt ?? "?"} ${event.title}`).join(", ");

    advisories.push({
      id: "news-at-open",
      severity: tierOneAtOpen.length > 0 && config.newsPolicy === "stand-aside" ? "block" : "warn",
      message: `High-impact news lands on the raid window: ${names}. Treat the release as the vehicle that delivers the manipulation leg, not as a direction signal — but the rejection test is unreliable inside the release candle, because the first minute prints both sides before settling.`,
    });

    advisories.push({
      id: "wait-for-close",
      severity: "warn",
      message: `Do not judge the sweep until the release candle and the one after it have closed. Judging mid-candle is how expansion gets mistaken for a raid on exactly the days that punish it hardest.`,
    });

    if (tierOneAtOpen.length > 0) {
      const tierNames = tierOneAtOpen.map((event) => event.title).join(", ");
      advisories.push({
        id: "tier-one",
        severity: config.newsPolicy === "stand-aside" ? "block" : "warn",
        message: `${tierNames} is a repricing event, not a liquidity event. The model's premise — that the move past the level exists to fill orders — does not hold when the market is discovering a new price. ${
          config.newsPolicy === "stand-aside"
            ? "Policy is stand-aside, so this is a no-trade."
            : "Policy is caution; if you take it, expect the stop to be tested by noise rather than by being wrong."
        }`,
      });
    }
  }

  // ---- Elevated: the range was built on news ---------------------------
  const preOpen = relevant.filter(
    (event) => (event.phase === "pre-open" || event.phase === "opening-range") && event.impact === "high",
  );
  if (preOpen.length > 0) {
    if (regime === "clear") regime = "elevated";
    const names = preOpen.map((event) => `${event.timeEt ?? "?"} ${event.title}`).join(", ");
    advisories.push({
      id: "range-inflated",
      severity: "note",
      message: `The 09:30–10:00 range was built after ${names}. Expect it wider than usual: the raid threshold scales with the range so it adapts automatically, but the stop sits beyond a wider raid extreme, so fewer setups will clear the reward:risk floor. That is the filter working, not a reason to lower it.`,
    });
  }

  // ---- Elevated: something is coming while you hold --------------------
  const holding = relevant.filter((event) => event.phase === "holding" && event.impact === "high");
  if (holding.length > 0) {
    if (regime === "clear") regime = "elevated";
    const first = holding[0] as ClassifiedEvent;
    advisories.push({
      id: "cap-holding",
      severity: "warn",
      message: `${first.timeEt ?? "later"} ${first.title} lands while a position from this setup would still be open. The target may not be reached first. Either be flat before it, or accept that the outcome is decided by the release rather than by the model.`,
    });
  }

  // ---- Holidays and thin books ----------------------------------------
  const holidays = classified.filter((event) => event.impact === "holiday" && event.relevant);
  if (holidays.length > 0) {
    if (regime === "clear") regime = "elevated";
    advisories.push({
      id: "thin-book",
      severity: "warn",
      message: `${(holidays[0] as ClassifiedEvent).title} — thin participation. The levels this model raids are only meaningful when enough people are watching them to have left orders there.`,
    });
  }

  // ---- Inferred impact is a weaker basis -------------------------------
  if (relevant.some((event) => event.impactInferred && event.impact === "high")) {
    advisories.push({
      id: "impact-inferred",
      severity: "note",
      message: `Impact for at least one event was inferred from its title rather than read from the calendar. Check the colour coding on ForexFactory if the verdict turns on it.`,
    });
  }

  // ---- A surprise is worth naming, not quantifying ---------------------
  const surprises = relevant.filter(
    (event) =>
      event.impact === "high" &&
      event.actual != null &&
      event.forecast != null &&
      event.actual.trim() !== "" &&
      event.actual.trim() !== event.forecast.trim(),
  );
  for (const event of surprises.slice(0, 3)) {
    advisories.push({
      id: `surprise:${event.title}`,
      severity: "note",
      message: `${event.title} came in at ${event.actual} against ${event.forecast} forecast. A deviation is what powers the move through the level; it does not tell you which way the day resolves, and the model still waits for the rejection.`,
    });
  }

  return { regime, events: classified, relevant, advisories, ...(options.unavailable ? { unavailable: options.unavailable } : {}) };
}

function classify(event: NewsEvent, config: ModelConfig): ClassifiedEvent {
  const relevant = config.newsCurrencies.includes(event.currency.toUpperCase());

  if (event.timeEt === null) {
    // All-day and tentative entries cannot be placed on the clock. A holiday
    // still matters; anything else is context only.
    return {
      ...event,
      phase: event.impact === "holiday" ? "pre-open" : "outside",
      minutesFromKeyOpen: null,
      relevant,
    };
  }

  const minute = minutesOf(event.timeEt);
  const keyOpen = minutesOf(config.keyOpen);
  const accStart = minutesOf(config.accumulationStart);
  const manipulationEnd = minutesOf(config.manipulationEnd);
  const displacementEnd = minutesOf(config.displacementEnd);
  const entryCutoff = minutesOf(config.entryCutoff);
  const flatten = minutesOf(config.flattenAt);

  const delta = minute - keyOpen;
  let phase: NewsPhase;

  if (Math.abs(delta) <= config.newsBlackoutMinutes) phase = "at-key-open";
  else if (minute < accStart) phase = "pre-open";
  else if (minute < keyOpen) phase = "opening-range";
  else if (minute < manipulationEnd) phase = "manipulation";
  else if (minute < displacementEnd) phase = "distribution";
  else if (minute < flatten) phase = entryCutoff <= minute ? "holding" : "holding";
  else phase = "outside";

  return { ...event, phase, minutesFromKeyOpen: delta, relevant };
}

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

function isTierOne(title: string): boolean {
  return TIER_ONE_PATTERNS.some((pattern) => pattern.test(title));
}

/** Looks like a calendar value: `0.4%`, `52.1`, `7.44M`, `-0.2%`, `1.25B`. */
const VALUE_TOKEN = /^-?\d[\d.,]*\s*[%KMBT]?$/;

/**
 * Separate an event title from its trailing Actual/Forecast/Previous values.
 *
 * Pasted text has no column separators, so the split is positional and
 * therefore a heuristic: ForexFactory leaves Actual blank until a release
 * happens, so three trailing values mean actual/forecast/previous and two mean
 * forecast/previous. It is right for the common cases and wrong for an event
 * that reports an actual with no forecast — which is why `--calendar` with the
 * JSON feed is the exact path and this one is the convenient one.
 */
function splitTitleAndValues(rest: string): {
  title: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
} {
  // Columns pasted with wide gaps are unambiguous — prefer that when present.
  const wideColumns = rest.split(/\s{2,}/).map((cell) => cell.trim()).filter(Boolean);
  const tokens =
    wideColumns.length > 1 ? wideColumns : (rest.match(/\S+/g) ?? []);

  const values: string[] = [];
  while (tokens.length > 1 && VALUE_TOKEN.test(tokens[tokens.length - 1] as string)) {
    values.unshift(tokens.pop() as string);
    if (values.length === 3) break;
  }

  const title = tokens.join(" ").trim();

  if (values.length >= 3) {
    return { title, actual: values[0] ?? null, forecast: values[1] ?? null, previous: values[2] ?? null };
  }
  if (values.length === 2) {
    return { title, actual: null, forecast: values[0] ?? null, previous: values[1] ?? null };
  }
  if (values.length === 1) {
    return { title, actual: null, forecast: null, previous: values[0] ?? null };
  }
  return { title, actual: null, forecast: null, previous: null };
}

export function inferImpact(title: string): NewsImpact {
  if (/bank holiday|holiday/i.test(title)) return "holiday";
  return HIGH_IMPACT_PATTERNS.some((pattern) => pattern.test(title)) ? "high" : "low";
}

function markerToImpact(marker: string): NewsImpact {
  const value = marker.toLowerCase();
  if (value === "!!!" || value === "high") return "high";
  if (value === "!!" || value === "medium" || value === "med") return "medium";
  if (value === "holiday") return "holiday";
  return "low";
}

function normaliseImpact(raw: unknown): NewsImpact {
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("high")) return "high";
  if (value.includes("medium")) return "medium";
  if (value.includes("holiday")) return "holiday";
  return "low";
}

function asText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  return text.length === 0 ? null : text;
}

/** `10:00am` / `2:30pm` / `14:00` → `HH:MM`. */
export function to24Hour(raw: string): string | null {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(raw.trim());
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3]?.toLowerCase();

  if (suffix === "pm" && hour !== 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** ET date and `HH:MM` for an epoch, without pulling in the whole time module. */
function etParts(epochMs: number): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(epochMs));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}
