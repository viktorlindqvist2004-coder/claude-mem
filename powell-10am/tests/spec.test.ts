import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, RULE_NOTES, makeConfig, noteFor } from "../src/spec.js";

describe("rule spec", () => {
  // The spec is the project's contract with itself: every knob the engine reads
  // must carry a provenance note, or the "sourced vs invented" distinction the
  // whole project rests on quietly rots.
  test("every config key has a provenance note", () => {
    const configKeys = Object.keys(DEFAULT_CONFIG).sort();
    const noteIds = RULE_NOTES.map((note) => note.id).sort();
    expect(noteIds).toEqual(configKeys);
  });

  test("no note refers to a config key that does not exist", () => {
    for (const note of RULE_NOTES) {
      expect(DEFAULT_CONFIG).toHaveProperty(note.id);
    }
  });

  test("every note declares a valid confidence level", () => {
    for (const note of RULE_NOTES) {
      expect(["sourced", "inferred", "tunable"]).toContain(note.confidence);
    }
  });

  test("the defining rules are marked sourced, not invented", () => {
    expect(noteFor("keyOpen")?.confidence).toBe("sourced");
    expect(noteFor("requireCisd")?.confidence).toBe("sourced");
    expect(noteFor("requireCloseBackInside")?.confidence).toBe("sourced");
  });

  test("the session clock is sourced, not tunable", () => {
    // These are conventions, not published numbers, and the docs say so.
    // These were "tunable" — invented windows nobody had a source for. The
    // transcripts settle them, and mismarking them would invite the next
    // session to "improve" the one thing that is now actually known.
    expect(noteFor("manipulationEnd")?.confidence).toBe("sourced");
    expect(noteFor("accumulationStart")?.confidence).toBe("sourced");
    expect(noteFor("displacementEnd")?.confidence).toBe("tunable");
  });
});

describe("makeConfig", () => {
  test("merges overrides onto the defaults", () => {
    const config = makeConfig({ minPlannedR: 3, entryMode: "ote-sweet" });
    expect(config.minPlannedR).toBe(3);
    expect(config.entryMode).toBe("ote-sweet");
    expect(config.keyOpen).toBe(DEFAULT_CONFIG.keyOpen);
  });

  test("returns a fresh object rather than mutating the defaults", () => {
    const config = makeConfig({ minPlannedR: 99 });
    expect(DEFAULT_CONFIG.minPlannedR).toBe(3);
    expect(config).not.toBe(DEFAULT_CONFIG);
  });
});
