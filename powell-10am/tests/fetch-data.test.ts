/**
 * Tests for the free-data fetcher's response handling.
 *
 * The `fetch` call itself cannot be exercised here — every market data host is
 * blocked from this environment by policy — so these cover the part that can be:
 * what happens to the shapes a response might actually arrive in.
 */
import { describe, expect, test } from "bun:test";
import { parseYahooChart } from "../scripts/fetch-data.js";
import { parseCsv, toCsv } from "../src/csv.js";

const chart = (
  timestamp: number[],
  quote: Record<string, (number | null)[]>,
): unknown => ({ chart: { result: [{ timestamp, indicators: { quote: [quote] } }] } });

describe("Yahoo chart responses", () => {
  test("a normal response becomes candles with millisecond stamps", () => {
    const candles = parseYahooChart(
      chart([1783430400, 1783430700], {
        open: [27700, 27710], high: [27720, 27730],
        low: [27690, 27700], close: [27710, 27725], volume: [1200, 1400],
      }),
    );
    expect(candles).toHaveLength(2);
    // Yahoo sends epoch SECONDS; storing them unscaled would date every bar to 1970.
    expect(candles[0]!.time).toBe(1783430400000);
    expect(new Date(candles[0]!.time).getUTCFullYear()).toBe(2026);
    expect(candles[0]).toMatchObject({ open: 27700, high: 27720, low: 27690, close: 27710, volume: 1200 });
  });

  test("null-padded bars are dropped, not turned into zeros", () => {
    const candles = parseYahooChart(
      chart([1, 2, 3], {
        open: [27700, null, 27720], high: [27720, null, 27740],
        low: [27690, null, 27710], close: [27710, null, 27730], volume: [1, null, 3],
      }),
    );
    expect(candles).toHaveLength(2);
    expect(candles.some((c) => c.open === 0)).toBe(false);
  });

  test("a partially null bar is dropped even if some fields are present", () => {
    const candles = parseYahooChart(
      chart([1], { open: [27700], high: [null], low: [27690], close: [27710] }),
    );
    expect(candles).toEqual([]);
  });

  test("a missing volume array is fine — volume is optional", () => {
    const candles = parseYahooChart(
      chart([1], { open: [1], high: [2], low: [0.5], close: [1.5] }),
    );
    expect(candles[0]!.volume).toBeUndefined();
  });

  test("Yahoo's own error is surfaced, not swallowed", () => {
    expect(() =>
      parseYahooChart({ chart: { error: { description: "No data found, symbol may be delisted" } } }),
    ).toThrow(/symbol may be delisted/);
  });

  test("an unrecognised shape throws rather than returning nothing", () => {
    // Silently returning [] would look like "the market was closed".
    expect(() => parseYahooChart({ chart: { result: [{}] } })).toThrow(/timestamp\/quote/);
    expect(() => parseYahooChart({})).toThrow(/timestamp\/quote/);
  });

  test("what it writes is what the loader reads back", () => {
    const candles = parseYahooChart(
      chart([1783430400], { open: [27700.25], high: [27720.5], low: [27690.75], close: [27710], volume: [1200] }),
    );
    const { candles: reloaded, errors } = parseCsv(toCsv(candles));
    expect(errors).toEqual([]);
    expect(reloaded).toEqual(candles);
  });
});
