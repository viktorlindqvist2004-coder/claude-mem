/**
 * Series indexing.
 *
 * Locating "the 10:00 candle on this date" by scanning the whole array is fine
 * once and ruinous 40,000 times — which is exactly what a parameter search
 * does. This builds the date/minute lookup once per series and memoises it
 * against the array identity, turning every lookup in `levels.ts` and
 * `model.ts` from a full scan into a map hit.
 *
 * The cache is keyed by array reference in a `WeakMap`, so a series is
 * collected normally once the caller drops it.
 */

import type { Candle } from "./types.js";
import { toEt } from "./time.js";

export interface SeriesIndex {
  /** Every ET date present, ascending. */
  dates: string[];
  /** Inclusive index bounds of each date's candles. */
  bounds: Map<string, { start: number; end: number }>;
  /** date → minute-of-day → array index. */
  minutes: Map<string, Map<number, number>>;
  /** Position of each date in `dates`, for O(1) previous-day lookup. */
  ordinal: Map<string, number>;
}

const cache = new WeakMap<Candle[], SeriesIndex>();

export function indexSeries(candles: Candle[]): SeriesIndex {
  const hit = cache.get(candles);
  if (hit) return hit;

  const bounds = new Map<string, { start: number; end: number }>();
  const minutes = new Map<string, Map<number, number>>();
  const dates: string[] = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    if (!candle) continue;
    const et = toEt(candle.time);

    const existing = bounds.get(et.date);
    if (existing) {
      existing.end = i;
    } else {
      bounds.set(et.date, { start: i, end: i });
      dates.push(et.date);
      minutes.set(et.date, new Map());
    }

    // First candle wins for a given minute, so duplicate rows in an export
    // cannot shift which bar the model calls "the key open".
    const dayMinutes = minutes.get(et.date) as Map<number, number>;
    if (!dayMinutes.has(et.minuteOfDay)) dayMinutes.set(et.minuteOfDay, i);
  }

  dates.sort();
  const ordinal = new Map<string, number>();
  dates.forEach((date, position) => ordinal.set(date, position));

  const index: SeriesIndex = { dates, bounds, minutes, ordinal };
  cache.set(candles, index);
  return index;
}

/** Array index of the candle whose ET wall-clock is `minuteOfDay` on `date`. */
export function indexAtMinute(
  candles: Candle[],
  date: string,
  minuteOfDay: number,
): number | null {
  return indexSeries(candles).minutes.get(date)?.get(minuteOfDay) ?? null;
}

/** Array index of the last candle on `date` strictly before `minuteOfDay`. */
export function indexBeforeMinute(
  candles: Candle[],
  date: string,
  minuteOfDay: number,
): number | null {
  const index = indexSeries(candles);
  const bound = index.bounds.get(date);
  if (!bound) return null;

  // Scanning one day is ~390 candles — cheap, and correct when a session has
  // gaps that a purely arithmetic offset would get wrong.
  let found: number | null = null;
  for (let i = bound.start; i <= bound.end; i++) {
    const candle = candles[i];
    if (!candle) continue;
    if (toEt(candle.time).minuteOfDay < minuteOfDay) found = i;
    else break;
  }
  return found;
}

/** The most recent date in the series strictly before `date`. */
export function previousDate(candles: Candle[], date: string): string | null {
  const index = indexSeries(candles);
  const position = index.ordinal.get(date);
  if (position === undefined) {
    // `date` is not in the series; fall back to the greatest date below it.
    let best: string | null = null;
    for (const candidate of index.dates) {
      if (candidate < date) best = candidate;
      else break;
    }
    return best;
  }
  return position > 0 ? (index.dates[position - 1] as string) : null;
}

/** Inclusive index bounds of a date's candles. */
export function boundsOf(candles: Candle[], date: string): { start: number; end: number } | null {
  return indexSeries(candles).bounds.get(date) ?? null;
}

/** Every ET date in the series, ascending. */
export function datesOf(candles: Candle[]): string[] {
  return indexSeries(candles).dates;
}
