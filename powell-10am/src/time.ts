/**
 * Eastern-Time session helpers.
 *
 * The model is defined entirely in New York wall-clock ("10am open" means
 * 10:00 ET whether that is 14:00 or 15:00 UTC), so every comparison goes
 * through `Intl.DateTimeFormat` with an explicit `America/New_York` zone.
 * That keeps March/November DST transitions correct without a date library.
 */

const ET_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export interface EtParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** `YYYY-MM-DD` in ET. */
  date: string;
  /** Minutes since ET midnight. */
  minuteOfDay: number;
}

const cache = new Map<number, EtParts>();

/** Convert a UTC epoch (ms) into New York wall-clock parts. */
export function toEt(epochMs: number): EtParts {
  const hit = cache.get(epochMs);
  if (hit) return hit;

  const parts = ET_FORMATTER.formatToParts(new Date(epochMs));
  const get = (type: string): number => {
    const found = parts.find((p) => p.type === type);
    return found ? Number(found.value) : 0;
  };

  // Intl renders midnight as hour 24 in some ICU versions; normalise to 0.
  const rawHour = get("hour");
  const hour = rawHour === 24 ? 0 : rawHour;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const minute = get("minute");

  const result: EtParts = {
    year,
    month,
    day,
    hour,
    minute,
    second: get("second"),
    date: `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`,
    minuteOfDay: hour * 60 + minute,
  };

  // Bound the cache so a multi-year backtest cannot grow it without limit.
  if (cache.size > 200_000) cache.clear();
  cache.set(epochMs, result);
  return result;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/** Minutes since ET midnight for an `HH:MM` string. */
export function minutesOf(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) throw new Error(`Invalid HH:MM time: ${hhmm}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error(`Invalid HH:MM time: ${hhmm}`);
  return hour * 60 + minute;
}

/**
 * True when `minuteOfDay` falls in `[start, end)`. Windows that wrap past
 * midnight (e.g. the 18:00 Asia open through 00:00) are supported by letting
 * `end` be numerically smaller than `start`.
 */
export function inWindow(minuteOfDay: number, start: number, end: number): boolean {
  if (start <= end) return minuteOfDay >= start && minuteOfDay < end;
  return minuteOfDay >= start || minuteOfDay < end;
}

/**
 * The ET "trading date" a candle belongs to. The 10am model is anchored to the
 * RTH day, so this is simply the ET calendar date — but it is a named function
 * because the Asia/midnight opens belong to the *following* trading day and
 * callers need to be explicit about which they want.
 */
export function tradingDate(epochMs: number): string {
  return toEt(epochMs).date;
}

/** Weekday index in ET, 0 = Sunday. */
export function etWeekday(epochMs: number): number {
  const { year, month, day } = toEt(epochMs);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Group candles by ET calendar date, preserving order within each day. */
export function groupByEtDate<T extends { time: number }>(candles: T[]): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const candle of candles) {
    const date = toEt(candle.time).date;
    let bucket = days.get(date);
    if (!bucket) {
      bucket = [];
      days.set(date, bucket);
    }
    bucket.push(candle);
  }
  return days;
}
