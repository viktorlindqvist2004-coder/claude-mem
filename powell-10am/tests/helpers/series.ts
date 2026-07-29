/**
 * Deterministic candle construction for tests.
 *
 * Fixtures are written in explicit EST (-05:00) wall-clock so a test asserting
 * "the 10:00 candle" is unambiguous regardless of where the suite runs. Dates
 * are chosen in January, well clear of any DST boundary — the DST behaviour
 * itself is tested separately in `time.test.ts`.
 */

import type { Candle } from "../../src/types.js";

export const TEST_DATE = "2026-01-06"; // a Tuesday, EST
export const PRIOR_DATE = "2026-01-05"; // the Monday before

/** One candle at an explicit ET wall-clock minute. */
export function candle(
  date: string,
  hhmm: string,
  open: number,
  high: number,
  low: number,
  close: number,
  offset = "-05:00",
): Candle {
  const time = Date.parse(`${date}T${hhmm}:00${offset}`);
  if (Number.isNaN(time)) throw new Error(`bad fixture time: ${date} ${hhmm}`);
  return { time, open, high, low, close, volume: 1000 };
}

/** Minutes since midnight → `HH:MM`. */
export function hhmm(minuteOfDay: number): string {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function minutesFrom(text: string): number {
  const [hours = "0", minutes = "0"] = text.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/**
 * A run of candles walking linearly from `startPrice` to `endPrice`, one per
 * minute over `[from, to)`. Wicks are a fixed fraction of the step so the
 * series has structure without being random.
 */
export function ramp(
  date: string,
  from: string,
  to: string,
  startPrice: number,
  endPrice: number,
  wick = 0.05,
): Candle[] {
  const start = minutesFrom(from);
  const end = minutesFrom(to);
  const steps = Math.max(1, end - start);
  const candles: Candle[] = [];

  for (let i = 0; i < steps; i++) {
    const open = startPrice + ((endPrice - startPrice) * i) / steps;
    const close = startPrice + ((endPrice - startPrice) * (i + 1)) / steps;
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;
    candles.push(candle(date, hhmm(start + i), open, high, low, close));
  }

  return candles;
}

/** A flat run at `price`, used to pad the parts of the day under test. */
export function flat(date: string, from: string, to: string, price: number, wick = 0.05): Candle[] {
  return ramp(date, from, to, price, price, wick);
}

/**
 * The canonical bullish 10am setup, scripted end to end:
 *
 *   09:30–10:00  accumulation builds a 100.0–104.0 range
 *   10:00        key open at 102.00
 *   10:01–10:03  raid: price drives through 100.0 to 99.80 and closes back inside
 *   10:04–10:06  displacement up through the key open, leaving a fair value gap
 *   10:07–10:12  retracement into the gap — the entry
 *   10:13–11:00  expansion to the standard deviation objective
 *
 * The prior session is included so the level builder has something to work with.
 */
export function bullishSetupDay(): Candle[] {
  const candles: Candle[] = [];

  // Prior session, so prior-day high/low/close exist.
  candles.push(...ramp(PRIOR_DATE, "09:30", "12:00", 98.0, 99.0));
  candles.push(...ramp(PRIOR_DATE, "12:00", "16:00", 99.0, 98.5));

  // 1. Accumulation: up to 104, down to 100, back to 102.
  candles.push(...ramp(TEST_DATE, "09:30", "09:40", 102.0, 104.0));
  candles.push(...ramp(TEST_DATE, "09:40", "09:52", 104.0, 100.0));
  candles.push(...ramp(TEST_DATE, "09:52", "10:00", 100.0, 102.0));

  // 2. Key open.
  candles.push(candle(TEST_DATE, "10:00", 102.0, 102.1, 101.8, 101.9));

  // 3. Manipulation: through the 100.00 opening-range low, closing back above.
  candles.push(candle(TEST_DATE, "10:01", 101.9, 101.95, 101.0, 101.1));
  candles.push(candle(TEST_DATE, "10:02", 101.1, 101.15, 100.2, 100.3));
  candles.push(candle(TEST_DATE, "10:03", 100.3, 100.35, 99.8, 100.3));

  // 4. Distribution: three bullish candles reclaiming the key open. The gap is
  //    between the 10:04 high and the 10:06 low.
  candles.push(candle(TEST_DATE, "10:04", 100.3, 100.9, 100.25, 100.85));
  candles.push(candle(TEST_DATE, "10:05", 100.85, 102.4, 100.8, 102.35));
  candles.push(candle(TEST_DATE, "10:06", 102.35, 102.6, 101.2, 102.5));

  // 5. Retracement into the gap. The 10:04 candle's high (100.90) and the
  //    10:05 candle's low (100.80) bracket the gap, so price must trade at or
  //    below 100.80 for the entry to fill.
  candles.push(...ramp(TEST_DATE, "10:07", "10:13", 102.5, 100.7));

  // 6. Expansion to the objective and beyond.
  candles.push(...ramp(TEST_DATE, "10:13", "11:00", 100.7, 108.5));
  candles.push(...flat(TEST_DATE, "11:00", "16:00", 108.0));

  return candles;
}

/**
 * A day that never raids anything: price drifts sideways from the open. Used to
 * assert the model declines to trade rather than inventing a setup.
 */
export function quietDay(): Candle[] {
  return [
    ...ramp(PRIOR_DATE, "09:30", "16:00", 100.0, 100.5),
    ...flat(TEST_DATE, "09:30", "16:00", 101.0),
  ];
}
