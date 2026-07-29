/**
 * The key level registry.
 *
 * The 10am open does not work in isolation — it is one of three opens Powell
 * anchors to, and it is read against a standing map of levels that were set
 * before the session. This module builds that whole map for a given trading
 * date so the model can ask "where is price relative to everything that
 * matters?" rather than looking at one line.
 *
 * Level families, in rough order of how much weight they carry:
 *
 *   Opens        18:00 (Asia / new day), 00:00 (true day open), 10:00 (NY AM 4H)
 *   Opening gaps NDOG (17:00 close → 18:00 open), NWOG (Fri 17:00 → Sun 18:00)
 *   Prior day    high, low, close
 *   Session      Asia range, London range, 09:30–10:00 opening range
 *   Weekly       weekly open
 *
 * Every level carries the epoch at which it became knowable, and the model
 * refuses to use a level whose `time` is at or after the candle being
 * evaluated. That is the single guard that keeps lookahead bias out.
 */

import type { Candle } from "./types.js";
import { inWindow, minutesOf, toEt, etWeekday } from "./time.js";
import { boundsOf, datesOf, indexAtMinute, previousDate } from "./series-index.js";

export type LevelKind =
  | "asia-open"
  | "midnight-open"
  | "key-open"
  | "ndog-high"
  | "ndog-low"
  | "ndog-ce"
  | "nwog-high"
  | "nwog-low"
  | "nwog-ce"
  | "prior-day-high"
  | "prior-day-low"
  | "prior-day-close"
  | "asia-high"
  | "asia-low"
  | "london-high"
  | "london-low"
  | "opening-range-high"
  | "opening-range-low"
  | "weekly-open";

export interface KeyLevel {
  kind: LevelKind;
  price: number;
  /** Epoch ms at which this level was fully formed and usable. */
  time: number;
  label: string;
  /** Relative weight 1-5, used when picking targets. */
  weight: number;
}

export interface LevelWindows {
  /** ET time the Asia session / new day opens. */
  asiaOpen: string;
  /** ET time of the true day open. */
  midnightOpen: string;
  /** ET time the futures session closes, forming the opening gap. */
  sessionClose: string;
  /** London session bounds in ET. */
  londonStart: string;
  londonEnd: string;
  /** RTH opening range bounds in ET. */
  openingRangeStart: string;
  openingRangeEnd: string;
  /** The model's anchoring open. */
  keyOpen: string;
}

export const DEFAULT_LEVEL_WINDOWS: LevelWindows = {
  asiaOpen: "18:00",
  midnightOpen: "00:00",
  sessionClose: "17:00",
  londonStart: "02:00",
  londonEnd: "05:00",
  openingRangeStart: "09:30",
  openingRangeEnd: "10:00",
  keyOpen: "10:00",
};

/**
 * Build the level map for `date` (an ET `YYYY-MM-DD`).
 *
 * `candles` must contain enough history to cover the prior session — at least
 * from 17:00 ET two days before. Levels that cannot be computed from the data
 * supplied are simply omitted rather than guessed.
 */
export function buildLevels(
  candles: Candle[],
  date: string,
  windows: Partial<LevelWindows> = {},
): KeyLevel[] {
  const w = { ...DEFAULT_LEVEL_WINDOWS, ...windows };
  const levels: KeyLevel[] = [];

  if (!boundsOf(candles, date)) return levels;

  const priorDate = previousDate(candles, date);

  // ---- Opens ---------------------------------------------------------
  const keyOpen = candleAtEtTime(candles, date, w.keyOpen);
  if (keyOpen) {
    levels.push(level("key-open", keyOpen.candle.open, keyOpen.candle.time, "10:00 key open", 5));
  }

  const midnight = candleAtEtTime(candles, date, w.midnightOpen);
  if (midnight) {
    levels.push(
      level("midnight-open", midnight.candle.open, midnight.candle.time, "midnight open (true day open)", 5),
    );
  }

  // The 18:00 open that starts *this* trading day printed on the previous
  // calendar date, so it is looked up there.
  if (priorDate) {
    const asia = candleAtEtTime(candles, priorDate, w.asiaOpen);
    if (asia) {
      levels.push(level("asia-open", asia.candle.open, asia.candle.time, "18:00 Asia open", 4));
    }

    // ---- New Day Opening Gap: 17:00 close → 18:00 open ---------------
    const priorClose = lastCandleBefore(candles, priorDate, w.sessionClose);
    if (asia && priorClose) {
      const gapHigh = Math.max(priorClose.candle.close, asia.candle.open);
      const gapLow = Math.min(priorClose.candle.close, asia.candle.open);
      const formedAt = asia.candle.time;
      levels.push(level("ndog-high", gapHigh, formedAt, "NDOG high", 3));
      levels.push(level("ndog-low", gapLow, formedAt, "NDOG low", 3));
      levels.push(level("ndog-ce", (gapHigh + gapLow) / 2, formedAt, "NDOG consequent encroachment", 4));
    }

    // ---- Prior day high / low / close --------------------------------
    const priorBounds = boundsOf(candles, priorDate);
    if (priorBounds) {
      const last = priorBounds.end;
      const extent = extremesOf(candles, priorBounds.start, last);
      const lastCandle = candles[last];
      if (extent && lastCandle) {
        levels.push(level("prior-day-high", extent.high, lastCandle.time, "prior day high", 5));
        levels.push(level("prior-day-low", extent.low, lastCandle.time, "prior day low", 5));
        levels.push(level("prior-day-close", lastCandle.close, lastCandle.time, "prior day close", 3));
      }
    }
  }

  // ---- Asia range: 18:00 (prior date) → midnight -------------------
  const asiaRange = rangeBetween(candles, priorDate, w.asiaOpen, date, w.midnightOpen);
  if (asiaRange) {
    levels.push(level("asia-high", asiaRange.high, asiaRange.endTime, "Asia session high", 4));
    levels.push(level("asia-low", asiaRange.low, asiaRange.endTime, "Asia session low", 4));
  }

  // ---- London range --------------------------------------------------
  const londonRange = rangeBetween(candles, date, w.londonStart, date, w.londonEnd);
  if (londonRange) {
    levels.push(level("london-high", londonRange.high, londonRange.endTime, "London session high", 4));
    levels.push(level("london-low", londonRange.low, londonRange.endTime, "London session low", 4));
  }

  // ---- RTH opening range: 09:30 → 10:00 ------------------------------
  const openingRange = rangeBetween(candles, date, w.openingRangeStart, date, w.openingRangeEnd);
  if (openingRange) {
    levels.push(
      level("opening-range-high", openingRange.high, openingRange.endTime, "09:30–10:00 opening range high", 5),
    );
    levels.push(
      level("opening-range-low", openingRange.low, openingRange.endTime, "09:30–10:00 opening range low", 5),
    );
  }

  // ---- Weekly open and NWOG -----------------------------------------
  const weekly = weeklyOpen(candles, date, w);
  if (weekly) {
    levels.push(level("weekly-open", weekly.open.open, weekly.open.time, "weekly open (Sun 18:00)", 4));
    if (weekly.priorClose) {
      const gapHigh = Math.max(weekly.priorClose, weekly.open.open);
      const gapLow = Math.min(weekly.priorClose, weekly.open.open);
      levels.push(level("nwog-high", gapHigh, weekly.open.time, "NWOG high", 4));
      levels.push(level("nwog-low", gapLow, weekly.open.time, "NWOG low", 4));
      levels.push(level("nwog-ce", (gapHigh + gapLow) / 2, weekly.open.time, "NWOG consequent encroachment", 5));
    }
  }

  return levels.sort((a, b) => a.time - b.time);
}

/** Levels usable at `asOf` — everything already formed. Guards against lookahead. */
export function levelsAsOf(levels: KeyLevel[], asOf: number): KeyLevel[] {
  return levels.filter((entry) => entry.time <= asOf);
}

export function findLevel(levels: KeyLevel[], kind: LevelKind): KeyLevel | null {
  return levels.find((entry) => entry.kind === kind) ?? null;
}

// ---------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------

function level(kind: LevelKind, price: number, time: number, label: string, weight: number): KeyLevel {
  return { kind, price, time, label, weight };
}

function indexesForDate(candles: Candle[], date: string): number[] {
  const indexes: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    if (candle && toEt(candle.time).date === date) indexes.push(i);
  }
  return indexes;
}

function candleAtEtTime(
  candles: Candle[],
  date: string,
  hhmm: string,
): { index: number; candle: Candle } | null {
  const index = indexAtMinute(candles, date, minutesOf(hhmm));
  if (index === null) return null;
  const candle = candles[index];
  return candle ? { index, candle } : null;
}

/** Last candle on `date` strictly before `hhmm` — used for the session close. */
function lastCandleBefore(
  candles: Candle[],
  date: string,
  hhmm: string,
): { index: number; candle: Candle } | null {
  const bounds = boundsOf(candles, date);
  if (!bounds) return null;
  const target = minutesOf(hhmm);

  let found: { index: number; candle: Candle } | null = null;
  for (let i = bounds.start; i <= bounds.end; i++) {
    const candle = candles[i];
    if (!candle) continue;
    if (toEt(candle.time).minuteOfDay < target) found = { index: i, candle };
    else break;
  }
  return found;
}

function extremesOf(candles: Candle[], from: number, to: number): { high: number; low: number } | null {
  let high = -Infinity;
  let low = Infinity;
  for (let i = from; i <= to; i++) {
    const candle = candles[i];
    if (!candle) continue;
    high = Math.max(high, candle.high);
    low = Math.min(low, candle.low);
  }
  if (high === -Infinity || low === Infinity) return null;
  return { high, low };
}

/**
 * Extremes between two ET wall-clock points, which may span midnight (the Asia
 * session does). Returns the time of the last candle in the window so callers
 * know when the level became final.
 */
function rangeBetween(
  candles: Candle[],
  startDate: string | null,
  startTime: string,
  endDate: string,
  endTime: string,
): { high: number; low: number; endTime: number } | null {
  if (!startDate) return null;
  const start = minutesOf(startTime);
  const end = minutesOf(endTime);

  let high = -Infinity;
  let low = Infinity;
  let lastTime = 0;

  // Only the one or two days the window can touch are scanned, rather than the
  // whole series — this runs tens of thousands of times during a search.
  const days = startDate === endDate ? [endDate] : [startDate, endDate];
  for (const day of days) {
    const bounds = boundsOf(candles, day);
    if (!bounds) continue;

    for (let i = bounds.start; i <= bounds.end; i++) {
      const candle = candles[i];
      if (!candle) continue;
      const et = toEt(candle.time);
      const inRange =
        startDate === endDate
          ? inWindow(et.minuteOfDay, start, end)
          : day === startDate
            ? et.minuteOfDay >= start
            : et.minuteOfDay < end;
      if (!inRange) continue;
      high = Math.max(high, candle.high);
      low = Math.min(low, candle.low);
      lastTime = Math.max(lastTime, candle.time);
    }
  }

  if (high === -Infinity || low === Infinity) return null;
  return { high, low, endTime: lastTime };
}

/**
 * The Sunday 18:00 open governing `date`, plus the preceding Friday 17:00
 * close, which together form the New Week Opening Gap.
 */
function weeklyOpen(
  candles: Candle[],
  date: string,
  w: LevelWindows,
): { open: Candle; priorClose: number | null } | null {
  const openMinute = minutesOf(w.asiaOpen);

  // Walk back through the dates rather than the candles: at most seven
  // iterations instead of a scan of the whole series.
  const dates = datesOf(candles);
  let weekOpen: Candle | null = null;
  let weekOpenDate: string | null = null;

  for (let i = dates.length - 1; i >= 0; i--) {
    const candidate = dates[i] as string;
    if (candidate > date) continue;
    const index = indexAtMinute(candles, candidate, openMinute);
    if (index === null) continue;
    const candle = candles[index];
    if (!candle || etWeekday(candle.time) !== 0) continue;
    weekOpen = candle;
    weekOpenDate = candidate;
    break;
  }

  if (!weekOpen || !weekOpenDate) return null;

  // The Friday close preceding that open.
  let priorClose: number | null = null;
  for (let i = (datesOf(candles).indexOf(weekOpenDate) ?? 0) - 1; i >= 0; i--) {
    const candidate = dates[i] as string;
    const bounds = boundsOf(candles, candidate);
    if (!bounds) continue;
    const lastCandle = candles[bounds.end];
    if (!lastCandle || etWeekday(lastCandle.time) !== 5) continue;
    const close = lastCandleBefore(candles, candidate, w.sessionClose);
    if (close) priorClose = close.candle.close;
    break;
  }

  return { open: weekOpen, priorClose };
}
