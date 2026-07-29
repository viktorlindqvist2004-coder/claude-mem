import { describe, expect, test } from "bun:test";
import { parseJournal, serialiseEntry, summariseJournal, type JournalEntry } from "../src/journal.js";

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    date: "2026-07-24",
    instrument: "NAS100",
    status: "valid",
    keyOpen: 28180,
    range: { high: 28460, low: 28170 },
    source: "screenshot",
    reviewedAt: "2026-07-29T23:00:00Z",
    ...overrides,
  };
}

describe("parseJournal", () => {
  test("reads JSONL and sorts by date", () => {
    const text = [
      serialiseEntry(entry({ date: "2026-07-29", status: "invalid" })),
      serialiseEntry(entry({ date: "2026-07-23", status: "invalid" })),
    ].join("\n");
    const entries = parseJournal(text);
    expect(entries.map((e) => e.date)).toEqual(["2026-07-23", "2026-07-29"]);
  });

  test("tolerates blank lines and comments", () => {
    const text = ["// seeded", "", serialiseEntry(entry()), ""].join("\n");
    expect(parseJournal(text)).toHaveLength(1);
  });

  test("names the offending line rather than failing silently", () => {
    const text = [serialiseEntry(entry()), "{not json"].join("\n");
    expect(() => parseJournal(text)).toThrow(/line 2/);
  });

  test("an empty journal is empty, not an error", () => {
    expect(parseJournal("")).toEqual([]);
  });
});

describe("summariseJournal", () => {
  test("counts setups and tallies rejections by gate", () => {
    const stats = summariseJournal([
      entry({ date: "2026-07-23", status: "invalid", failedGate: "manipulation" }),
      entry({ date: "2026-07-27", status: "invalid", failedGate: "rejection" }),
      entry({ date: "2026-07-29", status: "invalid", failedGate: "rejection" }),
      entry({ date: "2026-07-24", outcome: { result: "target", r: 3.35 } }),
    ]);
    expect(stats.daysReviewed).toBe(4);
    expect(stats.setups).toBe(1);
    expect(stats.setupRate).toBe(0.25);
    expect(stats.rejections[0]).toEqual({ gate: "rejection", count: 2 });
  });

  test("excludes no-fills and stand-asides from taken trades", () => {
    const stats = summariseJournal([
      entry({ date: "2026-08-03", outcome: { result: "no-fill" } }),
      entry({ date: "2026-08-04", outcome: { result: "not-taken" } }),
      entry({ date: "2026-08-05", outcome: { result: "stop", r: -1 } }),
    ]);
    expect(stats.taken).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.totalR).toBe(-1);
  });

  // A journal is exactly where a short run gets read as an edge, so the caveat
  // is part of the output rather than something the reader must remember.
  test("the confidence caveat scales with the sample and never flatters it", () => {
    expect(summariseJournal([]).confidence).toContain("Nothing here is a result");
    expect(
      summariseJournal([entry({ outcome: { result: "target", r: 3.35 } })]).confidence,
    ).toContain("anecdote");

    const many = Array.from({ length: 40 }, (_, i) =>
      entry({ date: `2026-09-${String(i + 1).padStart(2, "0")}`, outcome: { result: "target", r: 1 } }),
    );
    expect(summariseJournal(many).confidence).toContain("not enough to trust it");
  });

  test("reports how much of the record rests on axis-read prices", () => {
    const stats = summariseJournal([
      entry({ date: "2026-08-06", source: "screenshot" }),
      entry({ date: "2026-08-07", source: "hover" }),
      entry({ date: "2026-08-10", source: "screenshot" }),
    ]);
    expect(stats.sourceMix[0]).toEqual({ source: "screenshot", count: 2 });
  });

  test("zeroes rather than NaN on an empty journal", () => {
    const stats = summariseJournal([]);
    expect(stats.expectancy).toBe(0);
    expect(stats.setupRate).toBe(0);
  });
});

describe("the seeded journal", () => {
  test("the committed record parses and matches what was reviewed", async () => {
    const text = await Bun.file(new URL("../journal/entries.jsonl", import.meta.url)).text();
    const entries = parseJournal(text);
    const stats = summariseJournal(entries);
    expect(stats.daysReviewed).toBe(5);
    expect(stats.setups).toBe(1);
    expect(stats.totalR).toBeCloseTo(3.35, 2);
    expect(stats.confidence).toContain("anecdote");
  });
});
