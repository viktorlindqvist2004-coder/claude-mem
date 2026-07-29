/**
 * SMT divergence — Smart Money Technique.
 *
 * Two correlated instruments (classically NQ and ES) should raid the same pools
 * together. When one makes a lower low and the other refuses to, the raid is
 * not being confirmed by the complex: the move is a failure to distribute, and
 * the model reads it as manipulation rather than expansion.
 *
 * For the 10am model this is the highest-value optional filter, because it
 * distinguishes "swept the low and reversing" from "swept the low and going".
 */

import type { Candle, Direction } from "../types.js";
import { toEt } from "../time.js";

export interface SmtResult {
  present: boolean;
  /** Direction the divergence argues for. */
  direction: Direction | null;
  /** The two extremes compared, for the trade log. */
  detail: string;
}

/**
 * Compare the extreme printed on `primary` over `[fromTime, toTime]` with the
 * same window on `correlated`.
 *
 * `side: "low"` asks "did primary make a lower low that correlated did not
 * confirm?" — a bullish divergence. `side: "high"` is the bearish mirror.
 *
 * The two series are aligned by timestamp rather than index, so mismatched bar
 * counts or a gap in one feed cannot silently shift the comparison.
 */
export function detectSmt(
  primary: Candle[],
  correlated: Candle[],
  fromTime: number,
  toTime: number,
  side: "high" | "low",
): SmtResult {
  const primaryWindow = sliceByTime(primary, fromTime, toTime);
  const correlatedWindow = sliceByTime(correlated, fromTime, toTime);

  if (primaryWindow.length === 0 || correlatedWindow.length === 0) {
    return { present: false, direction: null, detail: "insufficient correlated data" };
  }

  // Split the window in half and compare the extreme of each half. A divergence
  // means one series extended its extreme in the second half while the other
  // did not.
  const primaryHalves = halves(primaryWindow);
  const correlatedHalves = halves(correlatedWindow);
  if (!primaryHalves || !correlatedHalves) {
    return { present: false, direction: null, detail: "window too short to split" };
  }

  if (side === "low") {
    const primaryExtended = primaryHalves.second.low < primaryHalves.first.low;
    const correlatedExtended = correlatedHalves.second.low < correlatedHalves.first.low;
    const present = primaryExtended !== correlatedExtended;
    return {
      present,
      direction: present ? "long" : null,
      detail: present
        ? `${primaryExtended ? "primary" : "correlated"} made a lower low the other did not confirm`
        : "both series agreed on the low",
    };
  }

  const primaryExtended = primaryHalves.second.high > primaryHalves.first.high;
  const correlatedExtended = correlatedHalves.second.high > correlatedHalves.first.high;
  const present = primaryExtended !== correlatedExtended;
  return {
    present,
    direction: present ? "short" : null,
    detail: present
      ? `${primaryExtended ? "primary" : "correlated"} made a higher high the other did not confirm`
      : "both series agreed on the high",
  };
}

function sliceByTime(candles: Candle[], fromTime: number, toTime: number): Candle[] {
  return candles.filter((candle) => candle.time >= fromTime && candle.time <= toTime);
}

function halves(
  window: Candle[],
): { first: { high: number; low: number }; second: { high: number; low: number } } | null {
  if (window.length < 4) return null;
  const mid = Math.floor(window.length / 2);
  return {
    first: extremes(window.slice(0, mid)),
    second: extremes(window.slice(mid)),
  };
}

function extremes(window: Candle[]): { high: number; low: number } {
  let high = -Infinity;
  let low = Infinity;
  for (const candle of window) {
    if (candle.high > high) high = candle.high;
    if (candle.low < low) low = candle.low;
  }
  return { high, low };
}

/** Convenience: SMT across the manipulation window of a given ET date. */
export function smtOverWindow(
  primary: Candle[],
  correlated: Candle[],
  fromTime: number,
  toTime: number,
  side: "high" | "low",
): SmtResult & { window: string } {
  const result = detectSmt(primary, correlated, fromTime, toTime, side);
  const from = toEt(fromTime);
  const to = toEt(toTime);
  return {
    ...result,
    window: `${from.date} ${pad(from.hour)}:${pad(from.minute)}–${pad(to.hour)}:${pad(to.minute)} ET`,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
