import { describe, expect, test } from "bun:test";
import { readDay } from "../src/model.js";
import { simulate } from "../src/trade.js";
import { makeConfig } from "../src/spec.js";
import { buildLevels, findLevel } from "../src/levels.js";
import { TEST_DATE, bullishSetupDay, quietDay } from "./helpers/series.js";

/**
 * The scripted day targets a standard-deviation objective. With the default
 * `opposing-liquidity` mode the nearest pool above the entry is the opening
 * range high, which sits too close to clear the 2R floor — correct behaviour,
 * but it makes for a poor end-to-end fixture, so the trade tests pin the target
 * mode explicitly.
 */
const stdDevConfig = makeConfig({ targetMode: "std-dev", stdDevTarget: -2 });

describe("readDay — the canonical bullish setup", () => {
  const candles = bullishSetupDay();

  test("anchors on the 10:00 key open", () => {
    const { read } = readDay(candles, TEST_DATE, stdDevConfig);
    expect(read.keyOpen.price).toBeCloseTo(102.0, 6);
    expect(read.keyOpen.hour).toBe(10);
  });

  test("measures the 09:30–10:00 accumulation range", () => {
    const { read } = readDay(candles, TEST_DATE, stdDevConfig);
    expect(read.accumulation).not.toBeNull();
    expect(read.accumulation!.high).toBeCloseTo(104.05, 1);
    expect(read.accumulation!.low).toBeCloseTo(99.95, 1);
  });

  test("identifies the raid on the opening range low", () => {
    const { read } = readDay(candles, TEST_DATE, stdDevConfig);
    expect(read.manipulation).not.toBeNull();
    expect(read.manipulation!.side).toBe("low");
    expect(read.manipulation!.extreme).toBeCloseTo(99.8, 2);
  });

  test("sets the bias away from the raid", () => {
    // Swept the lows, so the model is a buyer. Never the other way round.
    const { read } = readDay(candles, TEST_DATE, stdDevConfig);
    expect(read.bias).toBe("long");
  });

  test("finds the displacement that reclaims the key open, with a gap", () => {
    const { read } = readDay(candles, TEST_DATE, stdDevConfig);
    expect(read.distribution).not.toBeNull();
    expect(read.distribution!.direction).toBe("long");
    expect(read.distribution!.fvg).not.toBeNull();
    expect(read.distribution!.atrMultiple).toBeGreaterThanOrEqual(1.5);
  });

  test("anchors the dealing range from the raid extreme to the displacement high", () => {
    const { read } = readDay(candles, TEST_DATE, stdDevConfig);
    expect(read.dealingRange).not.toBeNull();
    expect(read.dealingRange!.from).toBeCloseTo(99.8, 2);
    expect(read.dealingRange!.to).toBeGreaterThan(102.0);
  });

  test("derives an OTE band inside the dealing range", () => {
    const { read } = readDay(candles, TEST_DATE, stdDevConfig);
    const { from, to } = read.dealingRange!;
    expect(read.ote!.sweet).toBeGreaterThan(Math.min(from, to));
    expect(read.ote!.sweet).toBeLessThan(Math.max(from, to));
  });

  test("projects standard deviation objectives beyond the leg", () => {
    const { read } = readDay(candles, TEST_DATE, stdDevConfig);
    const minusTwo = read.projections.find((entry) => entry.ratio === -2);
    expect(minusTwo).toBeDefined();
    expect(minusTwo!.price).toBeGreaterThan(read.dealingRange!.to);
  });

  test("produces a setup whose stop sits beyond the raid extreme", () => {
    const { setup } = readDay(candles, TEST_DATE, stdDevConfig);
    expect(setup).not.toBeNull();
    expect(setup!.direction).toBe("long");
    expect(setup!.stopPrice).toBeLessThan(99.8);
    expect(setup!.entryPrice).toBeGreaterThan(setup!.stopPrice);
    expect(setup!.targetPrice).toBeGreaterThan(setup!.entryPrice);
  });

  test("respects the reward:risk floor", () => {
    const { setup } = readDay(candles, TEST_DATE, stdDevConfig);
    expect(setup!.plannedR).toBeGreaterThanOrEqual(stdDevConfig.minPlannedR);
  });

  test("arms the entry only after the displacement candle has closed", () => {
    const { read, setup } = readDay(candles, TEST_DATE, stdDevConfig);
    expect(setup!.armedFromIndex).toBeGreaterThan(read.distribution!.endIndex);
  });
});

describe("readDay — rejections", () => {
  test("declines a day with no raid and explains why", () => {
    const { read, setup } = readDay(quietDay(), TEST_DATE, stdDevConfig);
    expect(setup).toBeNull();
    expect(read.rejectedReason).toContain("no liquidity sweep");
  });

  test("declines when the reward:risk floor cannot be met", () => {
    const config = makeConfig({ targetMode: "std-dev", stdDevTarget: -2, minPlannedR: 50 });
    const { read, setup } = readDay(bullishSetupDay(), TEST_DATE, config);
    expect(setup).toBeNull();
    expect(read.rejectedReason).toContain("below the 50R floor");
  });

  test("declines when displacement must be stronger than the day delivered", () => {
    const config = makeConfig({ targetMode: "std-dev", minDisplacementAtr: 99 });
    const { read, setup } = readDay(bullishSetupDay(), TEST_DATE, config);
    expect(setup).toBeNull();
    expect(read.rejectedReason).toContain("displacement");
  });

  test("declines when SMT is required but no correlated series was supplied", () => {
    const config = makeConfig({ targetMode: "std-dev", requireSmt: true });
    const { read, setup } = readDay(bullishSetupDay(), TEST_DATE, config);
    expect(setup).toBeNull();
    expect(read.rejectedReason).toContain("correlated series");
  });

  test("skips excluded weekdays", () => {
    // 2026-01-06 is a Tuesday; permit Mondays only.
    const config = makeConfig({ targetMode: "std-dev", tradingDays: [1] });
    const { read, setup } = readDay(bullishSetupDay(), TEST_DATE, config);
    expect(setup).toBeNull();
    expect(read.rejectedReason).toContain("weekday");
  });
});

describe("readDay — entry modes", () => {
  const candles = bullishSetupDay();

  test("the OTE sweet spot entry is deeper than the gap's near edge", () => {
    const proximal = readDay(candles, TEST_DATE, makeConfig({ targetMode: "std-dev", entryMode: "fvg-proximal" })).setup;
    const ote = readDay(candles, TEST_DATE, makeConfig({ targetMode: "std-dev", entryMode: "ote-sweet" })).setup;
    expect(proximal).not.toBeNull();
    expect(ote).not.toBeNull();
    // A deeper entry means less risk and a larger planned R.
    expect(ote!.entryPrice).toBeLessThan(proximal!.entryPrice);
    expect(ote!.plannedR).toBeGreaterThan(proximal!.plannedR);
  });

  test("labels record where the entry came from", () => {
    const { setup } = readDay(candles, TEST_DATE, makeConfig({ targetMode: "std-dev", entryMode: "ote-sweet" }));
    expect(setup!.entryLabel).toContain("OTE");
  });
});

describe("levels", () => {
  test("builds the prior-day levels from the preceding session", () => {
    const levels = buildLevels(bullishSetupDay(), TEST_DATE);
    const priorHigh = findLevel(levels, "prior-day-high");
    const priorLow = findLevel(levels, "prior-day-low");
    expect(priorHigh).not.toBeNull();
    expect(priorLow).not.toBeNull();
    expect(priorHigh!.price).toBeGreaterThan(priorLow!.price);
  });

  test("captures the 09:30–10:00 opening range", () => {
    const levels = buildLevels(bullishSetupDay(), TEST_DATE);
    expect(findLevel(levels, "opening-range-high")?.price).toBeCloseTo(104.05, 1);
    expect(findLevel(levels, "opening-range-low")?.price).toBeCloseTo(99.95, 1);
  });

  test("omits levels the data cannot support rather than guessing", () => {
    // No overnight session in the fixture, so there is no midnight open.
    const levels = buildLevels(bullishSetupDay(), TEST_DATE);
    expect(findLevel(levels, "midnight-open")).toBeNull();
  });
});

describe("end to end", () => {
  test("the scripted day fills and reaches its objective", () => {
    const candles = bullishSetupDay();
    const { setup } = readDay(candles, TEST_DATE, stdDevConfig);
    const trade = simulate(candles, setup!, stdDevConfig);

    expect(trade.outcome).toBe("target");
    expect(trade.r).toBeGreaterThan(0);
    expect(trade.entryTime).toBeGreaterThan(0);
    // The fill must come after the displacement, on the retracement.
    expect(trade.entryTime).toBeGreaterThan(setup!.read.distribution!.time);
  });
});
