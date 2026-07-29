import { describe, expect, test } from "bun:test";
import { etWeekday, groupByEtDate, inWindow, minutesOf, toEt, tradingDate } from "../src/time.js";

describe("toEt", () => {
  test("converts UTC to New York wall-clock in winter (EST, UTC-5)", () => {
    const et = toEt(Date.parse("2026-01-06T15:00:00Z"));
    expect(et.date).toBe("2026-01-06");
    expect(et.hour).toBe(10);
    expect(et.minute).toBe(0);
    expect(et.minuteOfDay).toBe(600);
  });

  test("converts UTC to New York wall-clock in summer (EDT, UTC-4)", () => {
    const et = toEt(Date.parse("2026-07-06T14:00:00Z"));
    expect(et.hour).toBe(10);
    expect(et.minuteOfDay).toBe(600);
  });

  // The whole point of routing through Intl: 10:00 ET is a different UTC
  // instant either side of the DST boundary, and the model must follow the
  // wall clock rather than a fixed offset.
  test("10:00 ET is 15:00 UTC before the spring transition and 14:00 UTC after", () => {
    const beforeDst = toEt(Date.parse("2026-03-06T15:00:00Z"));
    const afterDst = toEt(Date.parse("2026-03-10T14:00:00Z"));
    expect(beforeDst.hour).toBe(10);
    expect(afterDst.hour).toBe(10);
  });

  test("normalises midnight to hour 0", () => {
    const et = toEt(Date.parse("2026-01-06T05:00:00Z"));
    expect(et.hour).toBe(0);
    expect(et.minuteOfDay).toBe(0);
  });

  test("tradingDate reports the ET calendar date, not the UTC one", () => {
    // 02:00 UTC on the 7th is still the evening of the 6th in New York.
    expect(tradingDate(Date.parse("2026-01-07T02:00:00Z"))).toBe("2026-01-06");
  });
});

describe("minutesOf", () => {
  test("parses HH:MM", () => {
    expect(minutesOf("10:00")).toBe(600);
    expect(minutesOf("00:00")).toBe(0);
    expect(minutesOf("18:30")).toBe(1110);
  });

  test("rejects malformed and out-of-range input", () => {
    expect(() => minutesOf("25:00")).toThrow();
    expect(() => minutesOf("10:99")).toThrow();
    expect(() => minutesOf("1000")).toThrow();
  });
});

describe("inWindow", () => {
  test("is half-open: start inclusive, end exclusive", () => {
    expect(inWindow(600, 600, 630)).toBe(true);
    expect(inWindow(630, 600, 630)).toBe(false);
  });

  test("handles windows that wrap past midnight", () => {
    // 18:00 → 00:00, the Asia session.
    expect(inWindow(1140, 1080, 0)).toBe(true); // 19:00
    expect(inWindow(60, 1080, 0)).toBe(false); // 01:00 is outside
    expect(inWindow(1080, 1080, 0)).toBe(true); // 18:00 exactly
  });
});

describe("etWeekday", () => {
  test("reports the ET weekday", () => {
    expect(etWeekday(Date.parse("2026-01-06T15:00:00Z"))).toBe(2); // Tuesday
    expect(etWeekday(Date.parse("2026-01-05T15:00:00Z"))).toBe(1); // Monday
  });
});

describe("groupByEtDate", () => {
  test("buckets candles by ET date preserving order", () => {
    const candles = [
      { time: Date.parse("2026-01-06T15:00:00Z") },
      { time: Date.parse("2026-01-06T16:00:00Z") },
      { time: Date.parse("2026-01-07T15:00:00Z") },
    ];
    const grouped = groupByEtDate(candles);
    expect([...grouped.keys()]).toEqual(["2026-01-06", "2026-01-07"]);
    expect(grouped.get("2026-01-06")).toHaveLength(2);
  });
});
