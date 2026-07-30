import { describe, expect, test } from "bun:test";
import { evaluate, type ChartObservation } from "../src/verdict.js";
import { makeConfig } from "../src/spec.js";
import { readDay } from "../src/model.js";
import { TEST_DATE, bullishSetupDay } from "./helpers/series.js";

/** A clean bullish read: lows raided and rejected, displacement back through the open. */
function validObservation(overrides: Partial<ChartObservation> = {}): ChartObservation {
  return {
    instrument: "NQ",
    timeframe: "1m",
    keyOpenPrice: 102.0,
    accumulationHigh: 104.0,
    accumulationLow: 100.0,
    sweep: {
      side: "low",
      level: 100.0,
      levelSource: "opening range low",
      extreme: 99.8,
      closedBackInside: true,
    },
    displacement: {
      direction: "long",
      cisdConfirmed: true,
      leftFvg: true,
      fvgProximal: 100.8,
      fvgDistal: 100.35,
      extreme: 102.4,
      bodyToAtr: 2.3,
    },
    atr: 0.35,
    ...overrides,
  };
}

describe("valid setups", () => {
  test("passes every gate and produces a plan", () => {
    const verdict = evaluate(validObservation());
    expect(verdict.status).toBe("valid");
    expect(verdict.plan).not.toBeNull();
    expect(verdict.plan!.direction).toBe("long");
    // The news gate is `unknown` without a calendar; every structural gate passes.
    expect(
      verdict.gates.filter((gate) => gate.id !== "news").every((gate) => gate.status === "pass"),
    ).toBe(true);
  });

  test("the stop sits beyond the raid extreme, not the entry candle", () => {
    const plan = evaluate(validObservation()).plan!;
    expect(plan.stopPrice).toBeLessThan(99.8);
  });

  test("direction is taken from the raid, never chosen", () => {
    const short = evaluate(
      validObservation({
        sweep: {
          side: "high",
          level: 104.0,
          levelSource: "opening range high",
          extreme: 104.3,
          closedBackInside: true,
        },
        displacement: {
          direction: "short",
          cisdConfirmed: true,
          leftFvg: true,
          fvgProximal: 103.2,
          fvgDistal: 103.6,
          extreme: 101.5,
          bodyToAtr: 2.1,
        },
      }),
    );
    expect(short.status).toBe("valid");
    expect(short.plan!.direction).toBe("short");
    expect(short.plan!.stopPrice).toBeGreaterThan(104.3);
  });

  test("the entry is a limit behind price, so a pending retracement is 'available'", () => {
    const verdict = evaluate(validObservation({ currentPrice: 101.9 }));
    expect(verdict.plan!.stillAvailable).toBe(true);
  });

  test("flags chasing when price sits more than 1R from the entry", () => {
    const verdict = evaluate(validObservation({ currentPrice: 102.4 }));
    expect(verdict.plan!.assumptions.join(" ")).toContain("chasing");
  });

  test("says to let it go once price has already traded to the entry", () => {
    const verdict = evaluate(validObservation({ currentPrice: 100.5 }));
    expect(verdict.status).toBe("valid");
    expect(verdict.plan!.stillAvailable).toBe(false);
    expect(verdict.action).toContain("let this one go");
  });
});

describe("invalid setups", () => {
  // The single most expensive error in the model, so the verdict has to be
  // emphatic rather than merely negative.
  test("a sweep that closed through the level is called expansion, with a warning", () => {
    const verdict = evaluate(
      validObservation({
        sweep: {
          side: "low",
          level: 100.0,
          levelSource: "opening range low",
          extreme: 99.8,
          closedBackInside: false,
        },
      }),
    );
    expect(verdict.status).toBe("invalid");
    expect(verdict.action).toBe("No trade.");
    expect(verdict.reasoning.join(" ")).toContain("expansion");
    expect(verdict.reasoning.join(" ")).toContain("opposite direction");
  });

  test("a graze that does not clear the level is rejected", () => {
    const verdict = evaluate(
      validObservation({
        sweep: {
          side: "low",
          level: 100.0,
          levelSource: "opening range low",
          extreme: 99.99, // 0.01 against a 0.08 threshold
          closedBackInside: true,
        },
      }),
    );
    expect(verdict.status).toBe("invalid");
    expect(verdict.gates.find((gate) => gate.id === "penetration")?.status).toBe("fail");
  });

  test("displacement that never reclaimed the key open is rejected", () => {
    const verdict = evaluate(
      validObservation({
        displacement: {
          direction: "long",
          cisdConfirmed: false,
          leftFvg: true,
          fvgProximal: 100.8,
          fvgDistal: 100.35,
          extreme: 101.5,
          bodyToAtr: 2.0,
        },
      }),
    );
    expect(verdict.status).toBe("invalid");
    expect(verdict.gates.find((gate) => gate.id === "cisd")?.status).toBe("fail");
  });

  test("displacement running the same way as the raid is rejected", () => {
    const verdict = evaluate(
      validObservation({
        displacement: {
          direction: "short",
          cisdConfirmed: true,
          leftFvg: true,
          extreme: 98.0,
          bodyToAtr: 2.0,
        },
      }),
    );
    expect(verdict.status).toBe("invalid");
    expect(verdict.gates.find((gate) => gate.id === "direction")?.status).toBe("fail");
  });

  test("a setup that does not pay is declined on reward:risk", () => {
    const verdict = evaluate(
      validObservation({ targetCandidates: [{ price: 101.0, label: "minor swing high" }] }),
      makeConfig({ targetMode: "opposing-liquidity", minPlannedR: 2 }),
    );
    expect(verdict.status).toBe("invalid");
    expect(verdict.gates.find((gate) => gate.id === "reward")?.status).toBe("fail");
  });
});

describe("incomplete sequences", () => {
  test("no raid yet is 'forming', and says what to wait for", () => {
    const verdict = evaluate(validObservation({ sweep: null, displacement: null }));
    expect(verdict.status).toBe("forming");
    expect(verdict.action).toContain("Wait");
    expect(verdict.action).toContain("raided");
  });

  test("raid without displacement is 'forming', and names the direction already fixed", () => {
    const verdict = evaluate(validObservation({ displacement: null }));
    expect(verdict.status).toBe("forming");
    expect(verdict.action).toContain("long");
    expect(verdict.action).toContain("10:00 open");
  });
});

describe("unreadable charts", () => {
  // Guessing here would produce a confident wrong verdict, which is the one
  // output this feature must never produce.
  test("an unreadable sweep close yields 'uncertain', not a guess", () => {
    const verdict = evaluate(
      validObservation({
        sweep: {
          side: "low",
          level: 100.0,
          levelSource: "opening range low",
          extreme: 99.8,
          closedBackInside: null,
        },
      }),
    );
    expect(verdict.status).toBe("uncertain");
    expect(verdict.missing.join(" ")).toContain("CLOSED back inside");
  });

  test("a missing key open yields 'uncertain' and asks for it", () => {
    const verdict = evaluate(validObservation({ keyOpenPrice: null }));
    expect(verdict.status).toBe("uncertain");
    expect(verdict.missing.join(" ")).toContain("10:00 ET candle");
  });

  test("carries the reader's own stated uncertainties into the missing list", () => {
    const verdict = evaluate(
      validObservation({ uncertain: ["the time axis is cropped"] }),
    );
    expect(verdict.missing).toContain("the time axis is cropped");
  });

  test("falls back to the OTE entry when the gap edges are unreadable, and says so", () => {
    const verdict = evaluate(
      validObservation({
        displacement: {
          direction: "long",
          cisdConfirmed: true,
          leftFvg: true,
          extreme: 102.4,
          bodyToAtr: 2.3,
        },
      }),
      makeConfig({ entryMode: "fvg-proximal" }),
    );
    expect(verdict.plan!.entryLabel).toContain("OTE");
    expect(verdict.plan!.assumptions.join(" ")).toContain("not readable");
  });

  test("an absent ATR is assumed around, and the assumption is stated", () => {
    const verdict = evaluate(validObservation({ atr: null }));
    expect(verdict.plan!.assumptions.join(" ")).toContain("no ATR");
  });
});

describe("alignment with the engine", () => {
  // The screenshot path and the data path must agree, or the two halves of this
  // project tell users different things about the same model.
  test("the same day judged from a chart reading matches the engine's read", () => {
    const candles = bullishSetupDay();
    const config = makeConfig({ targetMode: "std-dev", stdDevTarget: -2, entryMode: "fvg-proximal" });
    const { read, setup } = readDay(candles, TEST_DATE, config);
    expect(setup).not.toBeNull();

    const verdict = evaluate(
      {
        keyOpenPrice: read.keyOpen.price,
        accumulationHigh: read.accumulation!.high,
        accumulationLow: read.accumulation!.low,
        sweep: {
          side: read.manipulation!.side,
          level: read.manipulation!.level,
          levelSource: read.manipulation!.source,
          extreme: read.dealingRange!.from,
          closedBackInside: true,
        },
        displacement: {
          direction: read.distribution!.direction,
          cisdConfirmed: true,
          leftFvg: true,
          fvgProximal: read.distribution!.fvg!.proximal,
          fvgDistal: read.distribution!.fvg!.distal,
          extreme: read.dealingRange!.to,
          bodyToAtr: read.distribution!.atrMultiple,
        },
      },
      config,
    );

    expect(verdict.status).toBe("valid");
    expect(verdict.plan!.direction).toBe(setup!.direction);
    expect(verdict.plan!.entryPrice).toBeCloseTo(setup!.entryPrice, 6);
    expect(verdict.plan!.targetPrice).toBeCloseTo(setup!.targetPrice, 6);
  });
});

describe("historical review", () => {
  // Live, a missing phase means "wait". On a closed day it means the window
  // came and went — and calling that "FORMING" invites hunting for a setup
  // after the fact.
  test("a closed day with no raid is a rejection, not 'forming'", () => {
    const live = evaluate(validObservation({ sweep: null, displacement: null }));
    expect(live.status).toBe("forming");

    const closed = evaluate(
      validObservation({ sweep: null, displacement: null, windowClosed: true }),
    );
    expect(closed.status).toBe("invalid");
    expect(closed.action).toBe("No trade.");
    expect(closed.reasoning.join(" ")).toContain("closed without either side being raided");
  });

  test("a closed day with a raid but no displacement is also a rejection", () => {
    const closed = evaluate(validObservation({ displacement: null, windowClosed: true }));
    expect(closed.status).toBe("invalid");
    expect(closed.gates.find((gate) => gate.id === "distribution")?.status).toBe("fail");
  });

  test("the flag changes nothing once every phase is present", () => {
    const withFlag = evaluate(validObservation({ windowClosed: true }));
    const without = evaluate(validObservation());
    expect(withFlag.status).toBe(without.status);
  });
});
