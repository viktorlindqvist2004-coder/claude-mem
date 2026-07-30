#!/usr/bin/env bun
/**
 * Command line entry point.
 *
 *   bun run src/cli.ts spec
 *   bun run src/cli.ts levels    <csv> --date 2026-03-10
 *   bun run src/cli.ts explain   <csv> [--date 2026-03-10]
 *   bun run src/cli.ts backtest  <csv> [--correlated es.csv] [--cost 0.05]
 *   bun run src/cli.ts learn     <csv> [--folds 4]
 *   bun run src/cli.ts ablate    <csv>
 *   bun run src/cli.ts verdict   <observation.json> [--paste calendar.txt]
 *   bun run src/cli.ts news      --paste calendar.txt   # what the calendar means
 *
 * Every command that reads market data takes a CSV with a header row naming
 * time/open/high/low/close columns. See `docs/09-data.md`.
 */

import { loadCsvFile } from "./csv.js";
import { ALL_MODELS, scanDay, type ConflictPolicy } from "./models/index.js";
import { readDay } from "./model.js";
import { simulate } from "./trade.js";
import { backtest } from "./backtest.js";
import { ablate, gridSearch, walkForward, type ParameterGrid } from "./learn.js";
import {
  explainDay,
  renderAblation,
  renderCandidates,
  renderSpec,
  renderJournal,
  renderNews,
  renderStats,
  renderVerdict,
  renderWalkForward,
} from "./report.js";
import { evaluate, type ChartObservation } from "./verdict.js";
import {
  parseJournal,
  serialiseEntry,
  summariseJournal,
  type JournalEntry,
} from "./journal.js";
import {
  buildNewsContext,
  fetchForexFactoryWeek,
  parseCalendarText,
  parseForexFactoryJson,
  type NewsContext,
} from "./news.js";
import { buildLevels } from "./levels.js";
import { DEFAULT_CONFIG, makeConfig, type ModelConfig } from "./spec.js";
import { groupByEtDate } from "./time.js";
import type { Candle } from "./types.js";

/** The search space used by `learn`. Kept small enough to run in seconds. */
const DEFAULT_GRID: ParameterGrid = {
  manipulationEnd: ["10:15", "10:30", "11:00"],
  minDisplacementAtr: [1.0, 1.5, 2.0],
  entryMode: ["fvg-proximal", "fvg-ce", "ote-sweet", "confluence"],
  targetMode: ["opposing-liquidity", "std-dev", "fixed-r"],
  stopBufferAtr: [0.1, 0.25, 0.5],
};

/**
 * A blank observation, printed by `verdict --template`.
 *
 * Every field that vision cannot reliably establish is `null` rather than a
 * plausible-looking default, because a wrong default here produces a confident
 * wrong verdict — the one output this whole feature must not produce.
 */
const OBSERVATION_TEMPLATE: ChartObservation = {
  instrument: "NQ",
  timeframe: "1m",
  date: "2026-03-10",
  keyOpenPrice: null,
  accumulationHigh: null,
  accumulationLow: null,
  sweep: {
    side: "low",
    level: 0,
    levelSource: "opening range low",
    extreme: 0,
    closedBackInside: null,
  },
  displacement: {
    direction: "long",
    closedThroughKeyOpen: null,
    leftFvg: null,
    extreme: 0,
    bodyToAtr: null,
  },
  targetCandidates: [],
  atr: null,
  smt: null,
  uncertain: [],
};

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);
  const positional = rest.filter((arg) => !arg.startsWith("--") && !isFlagValue(rest, arg));

  const config = configFromFlags(flags);

  switch (command) {
    case "spec":
      console.log(renderSpec(config));
      return 0;

    case "levels": {
      const candles = await requireCsv(positional[0], flags);
      const date = (flags.date as string) ?? lastDate(candles);
      const levels = buildLevels(candles, date);
      console.log(`── Key levels for ${date} ${"─".repeat(28)}`);
      if (levels.length === 0) {
        console.log("  none — the dataset does not cover the prior session");
        return 0;
      }
      for (const level of levels) {
        console.log(
          `  ${"★".repeat(level.weight).padEnd(5)} ${level.price.toFixed(2).padStart(10)}  ${level.label}`,
        );
      }
      return 0;
    }

    case "scan": {
      const candles = await requireCsv(positional[0], flags);
      const dates = flags.date ? [flags.date as string] : [...groupByEtDate(candles).keys()].sort();
      const onConflict = flags.onConflict as ConflictPolicy | undefined;
      for (const date of dates) {
        const result = scanDay(candles, date, ALL_MODELS, config, {
          ...(onConflict ? { onConflict } : {}),
        });
        console.log(`\n── ${date} ${"─".repeat(40)}`);
        for (const read of result.reads) {
          const mark = read.status === "setup" ? "✓" : read.status === "unavailable" ? "—" : "✗";
          const detail =
            read.status === "setup" && read.setup
              ? `${read.direction} @ ${read.setup.entryPrice.toFixed(2)} → ${read.setup.targetPrice.toFixed(2)} (${read.setup.plannedR.toFixed(2)}R)`
              : (read.reason ?? "");
          console.log(`  ${mark} ${read.modelName.padEnd(22)} ${detail}`);
        }
        console.log(`  ${result.outcome.toUpperCase()} → ${result.action}`);
        console.log(`  ${result.summary}`);
      }
      return 0;
    }

    case "explain": {
      const candles = await requireCsv(positional[0], flags);
      const dates = flags.date ? [flags.date as string] : [...groupByEtDate(candles).keys()].sort();
      for (const date of dates) {
        const { read, setup } = readDay(candles, date, config);
        const trade = setup ? simulate(candles, setup, config) : null;
        console.log(explainDay(read, setup, trade));
        console.log("");
      }
      return 0;
    }

    case "backtest": {
      const candles = await requireCsv(positional[0], flags);
      const correlated = flags.correlated
        ? (await loadCsvFile(flags.correlated as string, flags.tz ? { assumeTimezone: String(flags.tz) } : {})).candles
        : undefined;
      const result = backtest(candles, config, {
        costR: flags.cost === undefined ? undefined : Number(flags.cost),
        ...(correlated ? { correlated } : {}),
      });
      console.log(renderStats(result.stats));
      return 0;
    }

    case "learn": {
      const candles = await requireCsv(positional[0], flags);
      const folds = flags.folds === undefined ? 4 : Number(flags.folds);

      const ranked = gridSearch(candles, DEFAULT_GRID, { minTrades: 10 });
      console.log(renderCandidates(ranked));
      console.log("");

      try {
        const result = walkForward(candles, DEFAULT_GRID, { folds, minTrades: 10 });
        console.log(renderWalkForward(result));
      } catch (error) {
        console.log(`── Walk-forward skipped: ${(error as Error).message}`);
      }
      return 0;
    }

    case "verdict": {
      // Judges a chart reading rather than a dataset: the observation JSON is
      // what a pair of eyes (or a vision model) extracted from a screenshot.
      if (flags.template) {
        console.log(JSON.stringify(OBSERVATION_TEMPLATE, null, 2));
        return 0;
      }
      const path = positional[0];
      if (!path) {
        console.error("Usage: verdict <observation.json>   (or --template to print a blank one)");
        return 1;
      }
      const observation = (await Bun.file(path).json()) as ChartObservation;
      const news = await loadNews(flags, config);
      console.log(renderVerdict(evaluate(observation, config, news), observation));
      return 0;
    }

    case "news": {
      const news = await loadNews(flags, config, { fetchWhenAbsent: true });
      if (!news) {
        console.error("Supply --calendar <file>, --paste <file>, or allow --fetch.");
        return 1;
      }
      console.log(renderNews(news));
      return 0;
    }

    case "journal": {
      // The project's memory. A review session reads this first and appends to
      // it last; nothing else carries over between sessions.
      const path = (flags.file as string) ?? "journal/entries.jsonl";
      const file = Bun.file(path);
      const text = (await file.exists()) ? await file.text() : "";
      const entries = parseJournal(text);

      if (typeof flags.add === "string") {
        const entry = (await Bun.file(flags.add).json()) as JournalEntry;
        // Append-only: an outcome must never be able to rewrite the read that
        // preceded it.
        await Bun.write(path, `${text}${text.endsWith("\n") || text === "" ? "" : "\n"}${serialiseEntry(entry)}\n`);
        console.log(`Appended ${entry.date} (${entry.status}) to ${path}`);
        return 0;
      }

      console.log(renderJournal(entries, summariseJournal(entries)));
      return 0;
    }

    case "ablate": {
      const candles = await requireCsv(positional[0], flags);
      const { baseline, ablations } = ablate(candles, config);
      console.log(renderAblation(baseline, ablations));
      return 0;
    }

    default:
      console.log(usage());
      return command ? 1 : 0;
  }
}

function usage(): string {
  return [
    "powell-10am — a learning system for the 10am Key Open model",
    "",
    "  spec                          print the encoded rules with provenance",
    "  levels    <csv> --date D      key levels in force on a date",
    "  explain   <csv> [--date D]    narrate the model's read, day by day",
    "  scan      <csv> [--date D]    run every registered model and compare them",
    "  backtest  <csv> [--cost R]    run the model and report statistics",
    "  learn     <csv> [--folds N]   grid search plus walk-forward validation",
    "  ablate    <csv>               measure what each rule contributes",
    "  verdict   <json>              judge a chart reading (--template for a blank one)",
    "  news                          read the calendar (--calendar f | --paste f | --fetch)",
    "  journal   [--add entry.json]  the running record + running stats",
    "",
    "  Config overrides: --entryMode ote-sweet --targetMode std-dev --minPlannedR 3 ...",
    "",
    "  --tz <IANA zone>  read offset-less timestamps in this zone instead of UTC.",
    "                    Needed when an export writes a local wall clock, e.g.",
    "                    --tz America/New_York. TradingView's download says UTC in",
    "                    the dialog, so it does not need this.",
  ].join("\n");
}

/**
 * Resolve a calendar from whichever source is available.
 *
 * Order matters: an explicitly supplied file always beats the network, because
 * the feed is frequently unreachable and a silent fall-through to "no news" is
 * exactly the failure this layer exists to prevent.
 *
 *   --calendar <file>  ForexFactory JSON (the weekly feed, saved locally)
 *   --paste    <file>  calendar rows copied as text, or read off a screenshot
 *   --fetch            try the live feed
 */
async function loadNews(
  flags: Record<string, string | boolean>,
  config: ModelConfig,
  options: { fetchWhenAbsent?: boolean } = {},
): Promise<NewsContext | null> {
  const date = typeof flags.date === "string" ? flags.date : undefined;

  if (typeof flags.calendar === "string") {
    const raw = await Bun.file(flags.calendar).json();
    return buildNewsContext(parseForexFactoryJson(raw, date), config);
  }

  if (typeof flags.paste === "string") {
    const text = await Bun.file(flags.paste).text();
    return buildNewsContext(parseCalendarText(text), config);
  }

  if (flags.fetch === true || options.fetchWhenAbsent) {
    const { events, error } = await fetchForexFactoryWeek();
    const filtered = date
      ? events.filter((event) => event.timeEt !== null || event.impact === "holiday")
      : events;
    return buildNewsContext(filtered, config, error ? { unavailable: error } : {});
  }

  return null;
}

async function requireCsv(
  path: string | undefined,
  flags: Record<string, unknown> = {},
): Promise<Candle[]> {
  if (!path) {
    console.error("A CSV path is required. See `bun run src/cli.ts` for usage.");
    process.exit(1);
  }
  const assumeTimezone = flags.tz === undefined ? undefined : String(flags.tz);
  const { candles, errors } = await loadCsvFile(path, { ...(assumeTimezone ? { assumeTimezone } : {}) });
  if (errors.length > 0) {
    console.error(`⚠ ${errors.length} row(s) could not be parsed:`);
    for (const error of errors.slice(0, 5)) {
      console.error(`    line ${error.line}: ${error.reason}`);
    }
    if (errors.length > 5) console.error(`    … and ${errors.length - 5} more`);
  }
  if (candles.length === 0) {
    console.error("No usable candles were loaded.");
    process.exit(1);
  }
  return candles;
}

/** Any `--key value` pair naming a real config field becomes an override. */
function configFromFlags(flags: Record<string, string | boolean>): ModelConfig {
  const overrides: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(flags)) {
    if (!(key in DEFAULT_CONFIG)) continue;
    const current = (DEFAULT_CONFIG as unknown as Record<string, unknown>)[key];

    if (typeof current === "number") {
      overrides[key] = Number(raw);
    } else if (typeof current === "boolean") {
      overrides[key] = raw === true || raw === "true";
    } else if (Array.isArray(current)) {
      // Comma-separated, so `--newsCurrencies USD,EUR` stays an array rather
      // than becoming a string that silently breaks every `.includes` on it.
      const items = String(raw).split(",").map((item) => item.trim()).filter(Boolean);
      overrides[key] = current.every((item) => typeof item === "number")
        ? items.map(Number)
        : items;
    } else if (typeof current === "object" && current !== null) {
      // Nested objects (contextOpens) have no sensible flag form; ignore.
      continue;
    } else {
      overrides[key] = raw;
    }
  }
  return makeConfig(overrides as Partial<ModelConfig>);
}

function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg || !arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}

/** True when `arg` is consumed as the value of a preceding `--flag`. */
function isFlagValue(args: string[], arg: string): boolean {
  const index = args.indexOf(arg);
  if (index <= 0) return false;
  const previous = args[index - 1];
  return previous !== undefined && previous.startsWith("--");
}

function lastDate(candles: Candle[]): string {
  const dates = [...groupByEtDate(candles).keys()].sort();
  return dates[dates.length - 1] as string;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
