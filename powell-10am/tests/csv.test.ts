import { describe, expect, test } from "bun:test";
import { parseCsv, toCsv } from "../src/csv.js";

describe("parseCsv", () => {
  test("parses a standard export", () => {
    const { candles, errors } = parseCsv(
      ["time,open,high,low,close,volume", "2026-01-06T14:30:00Z,100,101,99,100.5,1234"].join("\n"),
    );
    expect(errors).toHaveLength(0);
    expect(candles).toHaveLength(1);
    expect(candles[0]!.open).toBe(100);
    expect(candles[0]!.volume).toBe(1234);
  });

  test("accepts columns in any order and alternative names", () => {
    const { candles } = parseCsv(
      ["c,l,h,o,timestamp", "100.5,99,101,100,2026-01-06T14:30:00Z"].join("\n"),
    );
    expect(candles[0]!.close).toBe(100.5);
    expect(candles[0]!.high).toBe(101);
  });

  test("infers timestamp units from magnitude", () => {
    const seconds = parseCsv(["time,open,high,low,close", "1767709800,1,1,1,1"].join("\n"));
    const millis = parseCsv(["time,open,high,low,close", "1767709800000,1,1,1,1"].join("\n"));
    const micros = parseCsv(["time,open,high,low,close", "1767709800000000,1,1,1,1"].join("\n"));
    expect(seconds.candles[0]!.time).toBe(1767709800000);
    expect(millis.candles[0]!.time).toBe(1767709800000);
    expect(micros.candles[0]!.time).toBe(1767709800000);
  });

  test("sorts output by time even when the input is shuffled", () => {
    const { candles } = parseCsv(
      [
        "time,open,high,low,close",
        "2026-01-06T15:00:00Z,2,2,2,2",
        "2026-01-06T14:00:00Z,1,1,1,1",
      ].join("\n"),
    );
    expect(candles[0]!.open).toBe(1);
    expect(candles[1]!.open).toBe(2);
  });

  test("handles quoted fields containing commas", () => {
    const { candles, errors } = parseCsv(
      ['time,open,high,low,close', '"2026-01-06T14:30:00Z",100,101,99,100.5'].join("\n"),
    );
    expect(errors).toHaveLength(0);
    expect(candles).toHaveLength(1);
  });

  // A silently truncated dataset produces a confident, wrong backtest. Bad rows
  // are reported rather than dropped.
  test("reports unparseable rows instead of skipping them silently", () => {
    const { candles, errors } = parseCsv(
      [
        "time,open,high,low,close",
        "2026-01-06T14:30:00Z,100,101,99,100.5",
        "not-a-date,100,101,99,100.5",
        "2026-01-06T14:32:00Z,100,abc,99,100.5",
      ].join("\n"),
    );
    expect(candles).toHaveLength(1);
    expect(errors).toHaveLength(2);
    expect(errors[0]!.line).toBe(3);
    expect(errors[1]!.reason).toContain("non-numeric");
  });

  test("rejects rows whose high is below their low", () => {
    const { errors } = parseCsv(
      ["time,open,high,low,close", "2026-01-06T14:30:00Z,100,98,99,100"].join("\n"),
    );
    expect(errors[0]!.reason).toContain("below low");
  });

  test("throws when a required column is missing", () => {
    expect(() => parseCsv(["time,open,high,close", "2026-01-06T14:30:00Z,1,1,1"].join("\n"))).toThrow(
      /missing required column/,
    );
  });

  test("returns nothing for empty input rather than throwing", () => {
    expect(parseCsv("").candles).toHaveLength(0);
  });
});

describe("toCsv", () => {
  test("round-trips through parseCsv", () => {
    const original = parseCsv(
      ["time,open,high,low,close,volume", "2026-01-06T14:30:00Z,100,101,99,100.5,7"].join("\n"),
    ).candles;
    const reparsed = parseCsv(toCsv(original)).candles;
    expect(reparsed).toEqual(original);
  });
});

describe("zone-less timestamps", () => {
  /**
   * Regression: these used to reach `Date.parse`, which resolves a stamp with no
   * offset against the machine's timezone. The docs promised UTC, and the test
   * suite agreed only because CI runs on UTC. Forcing a non-UTC zone is the
   * whole point of this test.
   */
  const cases = ["2026-07-08 09:30:00", "2026-07-08T09:30:00", "2026-07-08 09:30"];
  for (const stamp of cases) {
    test(`${stamp} is UTC regardless of the machine's timezone`, () => {
      const { candles, errors } = parseCsv(
        `time,open,high,low,close\n${stamp},1,2,0.5,1.5\n`,
      );
      expect(errors).toEqual([]);
      expect(candles).toHaveLength(1);
      expect(new Date(candles[0]!.time).toISOString()).toBe("2026-07-08T09:30:00.000Z");
    });
  }

  test("an explicit offset is still honoured", () => {
    const { candles } = parseCsv(
      `time,open,high,low,close\n2026-07-08T09:30:00-04:00,1,2,0.5,1.5\n`,
    );
    expect(new Date(candles[0]!.time).toISOString()).toBe("2026-07-08T13:30:00.000Z");
  });
});

describe("TradingView table-view exports", () => {
  test("the on-screen date spelling parses", () => {
    const { candles, errors } = parseCsv(
      `Date,Open,High,Low,Close\n` +
        `Thu 30 Jul '26 07:55,27739.50,27745.25,27728.50,27733.25\n` +
        `Mon 13 Jul '26 15:45,29450.75,29465.00,29434.25,29455.00\n`,
    );
    expect(errors).toEqual([]);
    expect(candles).toHaveLength(2);
    // Sorted ascending, so the July 13 row comes first despite being written second.
    expect(new Date(candles[0]!.time).toISOString()).toBe("2026-07-13T15:45:00.000Z");
    expect(new Date(candles[1]!.time).toISOString()).toBe("2026-07-30T07:55:00.000Z");
  });

  test("thousands separators and a Unicode minus survive", () => {
    const { candles, errors } = parseCsv(
      `time,open,high,low,close,change\n` +
        `2026-07-30T07:55:00Z,"27,739.50","27,745.25","27,728.50","27,733.25","−6.75 (−0.02%)"\n`,
    );
    expect(errors).toEqual([]);
    expect(candles[0]).toMatchObject({
      open: 27739.5, high: 27745.25, low: 27728.5, close: 27733.25,
    });
  });

  test("a decimal comma is NOT mistaken for a thousands separator", () => {
    // Stripping commas unconditionally would turn 27,5 into 275.
    const { candles } = parseCsv(`time,open,high,low,close\n1767709800,27.5,28,27,"27,5"\n`);
    expect(candles).toHaveLength(0);
  });

  test("assumeTimezone recovers a wall-clock export", () => {
    // The same reading, taken as UTC and as New York summer time.
    const row = `time,open,high,low,close\n2026-07-30 10:00:00,1,2,0.5,1.5\n`;
    expect(new Date(parseCsv(row).candles[0]!.time).toISOString()).toBe("2026-07-30T10:00:00.000Z");
    expect(
      new Date(parseCsv(row, { assumeTimezone: "America/New_York" }).candles[0]!.time).toISOString(),
    ).toBe("2026-07-30T14:00:00.000Z");
  });

  test("assumeTimezone is DST-correct across the boundary", () => {
    const winter = parseCsv(`time,open,high,low,close\n2026-01-15 10:00:00,1,2,0.5,1.5\n`, {
      assumeTimezone: "America/New_York",
    });
    expect(new Date(winter.candles[0]!.time).toISOString()).toBe("2026-01-15T15:00:00.000Z");
  });
});
