import { describe, expect, test } from "bun:test";
import {
  FIB_LEVELS,
  equilibrium,
  fibPrice,
  inOte,
  oteZone,
  premiumDiscount,
  projectionBeyond,
  projections,
  type DealingRange,
} from "../src/primitives/fib.js";

/** A bullish leg: raid low at 100, displacement high at 110. */
const bullish: DealingRange = { from: 100, to: 110, direction: "long" };
/** A bearish leg: raid high at 110, displacement low at 100. */
const bearish: DealingRange = { from: 110, to: 100, direction: "short" };

describe("fibPrice", () => {
  test("0.0 is the leg origin and 1.0 is a full retracement", () => {
    expect(fibPrice(bullish, 0)).toBeCloseTo(110, 6);
    expect(fibPrice(bullish, 1)).toBeCloseTo(100, 6);
  });

  test("negative ratios project beyond the leg", () => {
    // -1.0 is one full leg length past the displacement extreme.
    expect(fibPrice(bullish, -1)).toBeCloseTo(120, 6);
    expect(fibPrice(bearish, -1)).toBeCloseTo(90, 6);
  });
});

describe("oteZone", () => {
  test("spans 62% to 79% of the leg with the sweet spot at 70.5%", () => {
    const zone = oteZone(bullish);
    expect(zone.start).toBeCloseTo(103.8, 6); // 110 - 0.62 * 10
    expect(zone.sweet).toBeCloseTo(102.95, 6);
    expect(zone.end).toBeCloseTo(102.1, 6);
  });

  test("the sweet spot lies inside the band for both directions", () => {
    expect(inOte(bullish, oteZone(bullish).sweet)).toBe(true);
    expect(inOte(bearish, oteZone(bearish).sweet)).toBe(true);
  });

  test("a shallow retracement is outside the band", () => {
    // 30% back is nowhere near the OTE window.
    expect(inOte(bullish, fibPrice(bullish, 0.3))).toBe(false);
  });

  test("the constants match ICT's published levels", () => {
    expect(FIB_LEVELS.oteStart).toBe(0.62);
    expect(FIB_LEVELS.oteSweet).toBe(0.705);
    expect(FIB_LEVELS.oteEnd).toBe(0.79);
    expect(FIB_LEVELS.equilibrium).toBe(0.5);
  });
});

describe("premiumDiscount", () => {
  test("classifies against the midpoint of the leg", () => {
    expect(equilibrium(bullish)).toBeCloseTo(105, 6);
    expect(premiumDiscount(bullish, 108)).toBe("premium");
    expect(premiumDiscount(bullish, 102)).toBe("discount");
    expect(premiumDiscount(bullish, 105)).toBe("equilibrium");
  });

  test("the OTE band always sits in discount for a long", () => {
    // This is why the model buys there: the entry is structurally cheap.
    const zone = oteZone(bullish);
    expect(premiumDiscount(bullish, zone.sweet)).toBe("discount");
  });

  test("the OTE band always sits in premium for a short", () => {
    const zone = oteZone(bearish);
    expect(premiumDiscount(bearish, zone.sweet)).toBe("premium");
  });
});

describe("projections", () => {
  test("returns the canonical standard deviation objectives", () => {
    const ratios = projections(bullish).map((entry) => entry.ratio);
    expect(ratios).toContain(-1);
    expect(ratios).toContain(-2);
    expect(ratios).toContain(-2.5);
    expect(ratios).toContain(-4);
  });

  test("projections extend away from the raid", () => {
    const minusTwo = projections(bullish).find((entry) => entry.ratio === -2);
    expect(minusTwo?.price).toBeCloseTo(130, 6);
  });

  test("projectionBeyond skips objectives that are too close to be worth it", () => {
    const chosen = projectionBeyond(bullish, 105, 20);
    expect(chosen).not.toBeNull();
    expect(chosen?.price).toBeGreaterThanOrEqual(125);
  });

  test("projectionBeyond respects direction", () => {
    const chosen = projectionBeyond(bearish, 105, 5);
    expect(chosen?.price).toBeLessThan(105);
  });
});
