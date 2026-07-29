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
