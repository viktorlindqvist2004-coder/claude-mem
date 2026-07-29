import { describe, expect, test } from "bun:test";
import {
  buildNewsContext,
  inferImpact,
  parseCalendarText,
  parseForexFactoryJson,
  to24Hour,
  type NewsEvent,
} from "../src/news.js";
import { evaluate, type ChartObservation } from "../src/verdict.js";
import { makeConfig } from "../src/spec.js";

const config = makeConfig();

function event(overrides: Partial<NewsEvent>): NewsEvent {
  return { timeEt: "10:00", currency: "USD", impact: "high", title: "ISM Manufacturing PMI", ...overrides };
}

describe("to24Hour", () => {
  test("converts 12-hour times", () => {
    expect(to24Hour("10:00am")).toBe("10:00");
    expect(to24Hour("2:30pm")).toBe("14:30");
    expect(to24Hour("12:00am")).toBe("00:00");
    expect(to24Hour("12:30pm")).toBe("12:30");
  });

  test("passes 24-hour times through", () => {
    expect(to24Hour("14:00")).toBe("14:00");
  });

  test("rejects nonsense", () => {
    expect(to24Hour("25:00")).toBeNull();
    expect(to24Hour("later")).toBeNull();
  });
});

describe("parseCalendarText", () => {
  test("parses pasted rows", () => {
    const events = parseCalendarText(
      [
        "8:30am USD Core CPI m/m 0.3% 0.2% 0.2%",
        "10:00am USD ISM Manufacturing PMI",
        "All Day EUR Bank Holiday",
      ].join("\n"),
    );
    expect(events).toHaveLength(3);
    expect(events[0]!.timeEt).toBe("08:30");
    expect(events[1]!.title).toContain("ISM");
    expect(events[2]!.timeEt).toBeNull();
  });

  // Impact colour does not survive a copy-paste, so it is recovered from the
  // title — and the row says it was recovered rather than read.
  test("infers impact from the title and flags the inference", () => {
    const events = parseCalendarText("10:00am USD ISM Manufacturing PMI");
    expect(events[0]!.impact).toBe("high");
    expect(events[0]!.impactInferred).toBe(true);
  });

  test("an explicit marker beats inference", () => {
    const events = parseCalendarText("10:00am USD high Some Obscure Release");
    expect(events[0]!.impact).toBe("high");
    expect(events[0]!.impactInferred).toBeUndefined();
  });

  test("accepts bang markers", () => {
    expect(parseCalendarText("10:00am USD !!! Thing")[0]!.impact).toBe("high");
    expect(parseCalendarText("10:00am USD !! Thing")[0]!.impact).toBe("medium");
  });

  test("separates trailing values from the title", () => {
    const events = parseCalendarText("10:00am USD ISM Manufacturing PMI 52.1 48.3 48.4");
    expect(events[0]!.title).toBe("ISM Manufacturing PMI");
    expect(events[0]!.actual).toBe("52.1");
    expect(events[0]!.forecast).toBe("48.3");
    expect(events[0]!.previous).toBe("48.4");
  });

  // Before a release ForexFactory leaves Actual blank, so two values are
  // forecast and previous rather than actual and forecast.
  test("reads two trailing values as forecast and previous", () => {
    const events = parseCalendarText("10:00am USD JOLTS Job Openings 7.51M 7.44M");
    expect(events[0]!.title).toBe("JOLTS Job Openings");
    expect(events[0]!.actual).toBeNull();
    expect(events[0]!.forecast).toBe("7.51M");
  });

  test("leaves a title with no values alone", () => {
    const events = parseCalendarText("2:00pm USD FOMC Statement");
    expect(events[0]!.title).toBe("FOMC Statement");
    expect(events[0]!.previous).toBeNull();
  });

  test("skips day headers and blank lines", () => {
    const events = parseCalendarText(["Tue Mar 10", "", "10:00am USD ISM PMI"].join("\n"));
    expect(events).toHaveLength(1);
  });
});

describe("inferImpact", () => {
  test("recognises the releases that move index futures", () => {
    for (const title of ["Non-Farm Employment Change", "CPI m/m", "FOMC Statement", "JOLTS Job Openings", "Fed Chair Powell Speaks"]) {
      expect(inferImpact(title)).toBe("high");
    }
  });

  test("treats holidays as their own class", () => {
    expect(inferImpact("Bank Holiday")).toBe("holiday");
  });

  test("does not over-claim on ordinary rows", () => {
    expect(inferImpact("Natural Gas Storage")).toBe("low");
  });
});

describe("parseForexFactoryJson", () => {
  test("converts feed rows to ET wall-clock", () => {
    const events = parseForexFactoryJson([
      {
        title: "ISM Manufacturing PMI",
        country: "USD",
        date: "2026-03-10T14:00:00Z", // 10:00 ET in EDT
        impact: "High",
        forecast: "48.3",
        previous: "48.4",
      },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]!.timeEt).toBe("10:00");
    expect(events[0]!.impact).toBe("high");
  });

  test("drops rows from other dates when a date is given", () => {
    const raw = [
      { title: "A", country: "USD", date: "2026-03-10T14:00:00Z", impact: "High" },
      { title: "B", country: "USD", date: "2026-03-11T14:00:00Z", impact: "High" },
    ];
    expect(parseForexFactoryJson(raw, "2026-03-10")).toHaveLength(1);
  });

  test("ignores malformed input rather than throwing", () => {
    expect(parseForexFactoryJson(null)).toEqual([]);
    expect(parseForexFactoryJson([{ nonsense: true }])).toEqual([]);
  });
});

describe("classification and regime", () => {
  test("a release on the key open is a blackout", () => {
    const news = buildNewsContext([event({ timeEt: "10:00" })], config);
    expect(news.regime).toBe("blackout");
    expect(news.relevant[0]!.phase).toBe("at-key-open");
    expect(news.advisories.map((a) => a.id)).toContain("wait-for-close");
  });

  test("an 08:30 release only elevates — it shaped the range", () => {
    const news = buildNewsContext([event({ timeEt: "08:30", title: "Core CPI m/m" })], config);
    expect(news.regime).toBe("elevated");
    expect(news.relevant[0]!.phase).toBe("pre-open");
    expect(news.advisories.map((a) => a.id)).toContain("range-inflated");
  });

  test("a release during the holding period warns about being flat first", () => {
    const news = buildNewsContext([event({ timeEt: "14:00", title: "FOMC Statement" })], config);
    expect(news.relevant[0]!.phase).toBe("holding");
    expect(news.advisories.map((a) => a.id)).toContain("cap-holding");
  });

  test("non-USD releases are not relevant to an index future", () => {
    const news = buildNewsContext([event({ currency: "EUR", title: "German CPI" })], config);
    expect(news.relevant).toHaveLength(0);
    expect(news.regime).toBe("clear");
  });

  test("a quiet calendar is clear", () => {
    const news = buildNewsContext([event({ impact: "low", title: "Natural Gas Storage" })], config);
    expect(news.regime).toBe("clear");
  });

  test("a surprise is named but not quantified", () => {
    const news = buildNewsContext(
      [event({ actual: "52.1", forecast: "48.3", previous: "48.4" })],
      config,
    );
    const surprise = news.advisories.find((advisory) => advisory.id.startsWith("surprise:"));
    expect(surprise?.message).toContain("52.1");
    expect(surprise?.message).toContain("does not tell you which way");
  });
});

describe("policy", () => {
  const tierOne = [event({ timeEt: "10:00", title: "FOMC Statement" })];

  test("stand-aside blocks a tier-one release on the window", () => {
    const news = buildNewsContext(tierOne, makeConfig({ newsPolicy: "stand-aside" }));
    expect(news.advisories.some((advisory) => advisory.severity === "block")).toBe(true);
  });

  test("caution warns but does not block", () => {
    const news = buildNewsContext(tierOne, makeConfig({ newsPolicy: "caution" }));
    expect(news.advisories.some((advisory) => advisory.severity === "block")).toBe(false);
    expect(news.advisories.some((advisory) => advisory.severity === "warn")).toBe(true);
  });
});

// ---------------------------------------------------------------------

function validObservation(): ChartObservation {
  return {
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
      closedThroughKeyOpen: true,
      leftFvg: true,
      fvgProximal: 100.8,
      fvgDistal: 100.35,
      extreme: 102.4,
      bodyToAtr: 2.3,
    },
    atr: 0.35,
  };
}

describe("news in the verdict", () => {
  // An unchecked calendar qualifies the answer rather than blocking it —
  // otherwise every chart-only verdict would be "uncertain" and useless.
  test("an unchecked calendar qualifies the action and asks for the calendar", () => {
    const verdict = evaluate(validObservation(), config, null);
    expect(verdict.status).toBe("valid");
    expect(verdict.action).toContain("Calendar not checked");
    expect(verdict.missing.join(" ")).toContain("ForexFactory calendar");
    expect(verdict.gates.find((gate) => gate.id === "news")?.status).toBe("unknown");
  });

  test("a structural failure is not softened by the calendar caveat", () => {
    const broken = validObservation();
    broken.sweep!.closedBackInside = false;
    const verdict = evaluate(broken, config, null);
    expect(verdict.status).toBe("invalid");
    expect(verdict.action).toBe("No trade.");
  });

  test("newsPolicy 'ignore' skips the gate entirely", () => {
    const verdict = evaluate(validObservation(), makeConfig({ newsPolicy: "ignore" }), null);
    expect(verdict.status).toBe("valid");
    expect(verdict.gates.find((gate) => gate.id === "news")).toBeUndefined();
  });

  test("a clear calendar passes the gate and leaves the setup valid", () => {
    const news = buildNewsContext([], config);
    const verdict = evaluate(validObservation(), config, news);
    expect(verdict.status).toBe("valid");
    expect(verdict.gates.find((gate) => gate.id === "news")?.status).toBe("pass");
  });

  // The structural read is unchanged by news; only the framing and sizing are.
  test("a news-driven raid stays valid under caution, with the qualifier in the action", () => {
    const news = buildNewsContext([event({ timeEt: "10:00" })], config);
    const verdict = evaluate(validObservation(), config, news);
    expect(verdict.status).toBe("valid");
    expect(verdict.action).toContain("news-driven raid");
    expect(verdict.action).toContain("release candle to close");
  });

  test("a tier-one release under stand-aside makes the day a no-trade", () => {
    const strict = makeConfig({ newsPolicy: "stand-aside" });
    const news = buildNewsContext([event({ timeEt: "10:00", title: "FOMC Statement" })], strict);
    const verdict = evaluate(validObservation(), strict, news);
    expect(verdict.status).toBe("invalid");
    expect(verdict.gates.find((gate) => gate.id === "news")?.status).toBe("fail");
    expect(verdict.reasoning.join(" ")).toContain("repricing event");
  });

  test("advisories are carried into the reasoning", () => {
    const news = buildNewsContext([event({ timeEt: "08:30", title: "Core CPI m/m" })], config);
    const verdict = evaluate(validObservation(), config, news);
    expect(verdict.reasoning.join(" ")).toContain("wider");
  });
});
