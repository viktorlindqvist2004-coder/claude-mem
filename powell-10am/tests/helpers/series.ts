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
 * The canonical bullish setup, scripted end to end on the SOURCE's clock.
 *
 *   18:00–00:00  accumulation builds a 100.0–104.0 range (previous session day)
 *   00:00        midnight open — accumulation ends, manipulation begins
 *   03:00–03:03  raid: price drives through 100.0 to 99.80 and closes back inside
 *   03:04–03:06  CISD — a candle closes above the opposing leg's open, leaving a gap
 *   03:06–03:12  retracement into the gap, to its CE — the entry
 *   03:13–09:00  expansion toward the objective
 *   10:00        the key open, by which time distribution is under way
 *
 * The clock is the point. The engine used to script this whole sequence into
 * 09:30–10:30, which is where the source expects the move to be *finishing*.
 */
export function bullishSetupDay(): Candle[] {
  const candles: Candle[] = [];

  // Prior session daytime, so prior-day high/low/close exist as levels.
  candles.push(...ramp(PRIOR_DATE, "09:30", "12:00", 98.0, 99.0));
  candles.push(...ramp(PRIOR_DATE, "12:00", "16:00", 99.0, 98.5));

  // 1. Accumulation, 18:00 → midnight: up to 104, down to 100, back to 102.
  candles.push(...ramp(PRIOR_DATE, "18:00", "20:00", 102.0, 104.0));
  candles.push(...ramp(PRIOR_DATE, "20:00", "22:00", 104.0, 100.0));
  candles.push(...ramp(PRIOR_DATE, "22:00", "24:00", 100.0, 102.0));

  // 2. Midnight open, then quiet Asia hours.
  candles.push(...flat(TEST_DATE, "00:00", "03:00", 102.0));

  // 3. Manipulation: through the 100.00 accumulation low, closing back above.
  candles.push(candle(TEST_DATE, "03:00", 102.0, 102.05, 101.0, 101.1));
  candles.push(candle(TEST_DATE, "03:01", 101.1, 101.15, 100.2, 100.3));
  candles.push(candle(TEST_DATE, "03:02", 100.3, 100.35, 99.8, 100.3));

  // 4. CISD: three bullish candles closing back through the opening of the leg
  //    that delivered into the sweep. The gap sits between the 03:03 high and
  //    the 03:04 low.
  candles.push(candle(TEST_DATE, "03:03", 100.3, 100.9, 100.25, 100.85));
  candles.push(candle(TEST_DATE, "03:04", 100.85, 102.4, 100.8, 102.35));
  candles.push(candle(TEST_DATE, "03:05", 102.35, 102.6, 101.2, 102.5));

  // 5. Retracement into the gap. The entry is the CE — the 50% of the imbalance
  //    — not its near edge, so the retracement has to reach into the middle of
  //    the gap rather than just tag its top. It stops well above the 99.78 stop.
  candles.push(...ramp(TEST_DATE, "03:06", "03:12", 102.5, 100.4));

  // 6. Expansion to the objective and beyond, through the 10:00 open.
  candles.push(...ramp(TEST_DATE, "03:12", "09:00", 100.4, 108.5));
  candles.push(...flat(TEST_DATE, "09:00", "09:30", 108.0));
  // A distinct cash opening range, so that level is still exercised — it is a
  // real liquidity pool even though it is no longer the accumulation window.
  candles.push(...ramp(TEST_DATE, "09:30", "09:45", 108.0, 109.0));
  candles.push(...ramp(TEST_DATE, "09:45", "10:00", 109.0, 108.0));
  candles.push(...flat(TEST_DATE, "10:00", "16:00", 108.0));

  return candles;
}

/**
 * A day that never raids anything: price drifts sideways through accumulation
 * and manipulation alike. Used to assert the model declines to trade rather
 * than inventing a setup.
 */
export function quietDay(): Candle[] {
  return [
    ...ramp(PRIOR_DATE, "09:30", "16:00", 100.0, 100.5),
    ...flat(PRIOR_DATE, "18:00", "24:00", 101.0),
    ...flat(TEST_DATE, "00:00", "16:00", 101.0),
  ];
}
