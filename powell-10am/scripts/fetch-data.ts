#!/usr/bin/env bun
/**
 * Fetch free OHLC data and write it in the format the rest of the CLI reads.
 *
 * ## Why this exists
 *
 * TradingView's CSV download is gated behind a plan tier, and the review
 * environment this project is developed in cannot reach any market data host —
 * the gateway answers 403 to CONNECT for every one of them. So the fetch has to
 * happen on your machine, and it may as well be one command.
 *
 * ## Sources
 *
 *   yahoo       No account, no key. The cap is the lookback per interval:
 *               1m → 7 days, 5m/15m → 60 days, 1h → 730 days. 60 days of
 *               5-minute NQ is the "first look" band in docs/09-data.md — enough
 *               to read days and to see whether a rule is directionally sane,
 *               nowhere near enough to conclude anything.
 *
 *   json        A Yahoo chart response already downloaded — with curl, or by
 *               opening the URL in a browser and saving the page. Nothing is
 *               installed and nothing is fetched, so this is the path for someone
 *               who has a terminal but does not want a toolchain: they run one
 *               curl, send the file, and it is converted here.
 *
 *   dukascopy   No account either, and years of 1-minute history. Shells out to
 *               `npx dukascopy-node`, because the raw feed is LZMA-compressed
 *               bi5 tick data and decoding it here would be a project of its
 *               own. This is the option to use for a real backtest.
 *
 * ## Examples
 *
 *     bun run scripts/fetch-data.ts --source yahoo --symbol 'NQ=F' \
 *       --interval 5m --range 60d --out nq-5m.csv
 *
 *     bun run scripts/fetch-data.ts --source dukascopy --symbol usa100idxusd \
 *       --from 2024-01-01 --to 2026-07-30 --out us100-1m.csv
 *
 *     bun run scripts/fetch-data.ts --json ~/Desktop/nq-5m.json --out nq-5m.csv
 *
 *     bun run src/cli.ts explain  nq-5m.csv
 *     bun run src/cli.ts backtest nq-5m.csv
 *
 * ## Which symbol
 *
 *   NQ=F           Nasdaq-100 E-mini front month. What the model is written for,
 *                  and it trades nearly 24h, so the overnight levels work.
 *   usa100idxusd   Dukascopy's Nasdaq-100 CFD. Closest to a Capital.com-style
 *                  cash CFD, which is what you may actually be trading.
 *   QQQ            The ETF. Regular hours only, so no midnight open and no NDOG,
 *                  but the 09:30–10:00 accumulation and the 10:00 open are
 *                  entirely inside RTH, so the core of the model still reads.
 *   ^NDX           The index itself. RTH only and no volume.
 *
 * Prices differ between these — futures carry basis over cash — but the model
 * reads structure, not absolute level.
 *
 * ## A caveat I cannot remove
 *
 * **The network calls in here have never been executed.** They could not be:
 * every host is blocked from the environment this was written in. The parsing is
 * defensive and the failure messages say what to check, but if a response shape
 * has drifted you will find out before I do. Send me the error and I will fix it.
 */

import { toCsv } from "../src/csv.js";
import { toEt } from "../src/time.js";
import type { Candle } from "../src/types.js";

interface Args {
  source: "yahoo" | "dukascopy" | "json";
  symbol: string;
  interval: string;
  range: string;
  from?: string;
  to?: string;
  out: string;
  /** A Yahoo chart response already saved to disk — see `--source json`. */
  json?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    source: "yahoo",
    symbol: "NQ=F",
    interval: "5m",
    range: "60d",
    out: "data.csv",
  };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    const next = () => argv[++i]!;
    switch (token) {
      case "--source": args.source = next() as Args["source"]; break;
      case "--symbol": args.symbol = next(); break;
      case "--interval": args.interval = next(); break;
      case "--range": args.range = next(); break;
      case "--from": args.from = next(); break;
      case "--to": args.to = next(); break;
      case "--out": args.out = next(); break;
      case "--json": args.json = next(); args.source = "json"; break;
      default: throw new Error(`Unknown flag ${token}`);
    }
  }
  return args;
}

// ---------------------------------------------------------------------
// yahoo
// ---------------------------------------------------------------------

/** Lookback Yahoo will serve per interval. Asking for more silently truncates. */
const YAHOO_LIMITS: Record<string, string> = {
  "1m": "7d",
  "2m": "60d",
  "5m": "60d",
  "15m": "60d",
  "30m": "60d",
  "60m": "730d",
  "1h": "730d",
};

async function fetchYahoo(args: Args): Promise<Candle[]> {
  const cap = YAHOO_LIMITS[args.interval];
  if (cap && days(args.range) > days(cap)) {
    console.warn(
      `⚠ Yahoo serves at most ${cap} of ${args.interval} data. Asking for ` +
        `${args.range} returns ${cap} without saying so — expect a short file.`,
    );
  }

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(args.symbol)}` +
    `?interval=${args.interval}&range=${args.range}&includePrePost=true`;

  // Yahoo rejects requests with no User-Agent.
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(
      `Yahoo returned ${response.status} ${response.statusText}.\n` +
        `  404 — the symbol is probably wrong; futures need the =F suffix, e.g. NQ=F.\n` +
        `  429 — rate limited, wait a minute and retry.\n` +
        `  403 — Yahoo blocking the request, OR something between you and Yahoo. A\n` +
        `        corporate proxy or the sandbox this project was written in both\n` +
        `        answer 403 and it does not come from Yahoo at all.`,
    );
  }

  const body = await response.json();
  return parseYahooChart(body);
}

/**
 * Turn Yahoo's chart JSON into candles.
 *
 * Split out from the fetch on purpose. The network call cannot be exercised from
 * the environment this was written in, so the untestable surface is kept to the
 * single `fetch` line above, and everything that can go wrong with the *shape*
 * of a response is covered by tests.
 */
export function parseYahooChart(body: unknown): Candle[] {
  const chart = (body as {
    chart?: {
      error?: { description?: string };
      result?: {
        timestamp?: number[];
        indicators?: {
          quote?: {
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }[];
        };
      }[];
    };
  }).chart;
  if (chart?.error) throw new Error(`Yahoo: ${chart.error.description ?? "unknown error"}`);

  const result = chart?.result?.[0];
  const stamps = result?.timestamp;
  const quote = result?.indicators?.quote?.[0];
  if (!stamps || !quote) {
    throw new Error(
      "Yahoo's response had no timestamp/quote arrays. The endpoint shape may have " +
        "changed - send me the raw JSON and I will adjust the parser.",
    );
  }

  const candles: Candle[] = [];
  let skipped = 0;
  for (let i = 0; i < stamps.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    // Yahoo pads its arrays with nulls where a bar did not trade. Carrying those
    // through as zeros would invent candles at price 0.
    if (open == null || high == null || low == null || close == null) {
      skipped++;
      continue;
    }
    const volume = quote.volume?.[i];
    candles.push({
      time: stamps[i]! * 1000,
      open, high, low, close,
      ...(volume == null ? {} : { volume }),
    });
  }
  if (skipped > 0) console.log(`  ${skipped} empty bar(s) skipped (Yahoo pads gaps with nulls)`);
  return candles;
}

const days = (range: string): number => {
  const match = /^(\d+)([dmy])$/.exec(range);
  if (!match) return Number.POSITIVE_INFINITY;
  const n = Number(match[1]);
  return match[2] === "d" ? n : match[2] === "m" ? n * 31 : n * 366;
};

// ---------------------------------------------------------------------
// dukascopy
// ---------------------------------------------------------------------

async function fetchDukascopy(args: Args): Promise<Candle[]> {
  if (!args.from) throw new Error("dukascopy needs --from YYYY-MM-DD (and optionally --to).");
  const to = args.to ?? new Date().toISOString().slice(0, 10);

  // npx if Node is installed, bunx otherwise. Requiring both would mean two
  // installations to fetch one file, and whoever needs the data least wants a
  // toolchain.
  const runner = Bun.spawnSync(["which", "npx"]).exitCode === 0
    ? ["npx", "--yes"]
    : ["bunx"];
  console.log(`  running dukascopy-node via ${runner[0]} (first run downloads the package)…`);
  const proc = Bun.spawnSync(
    [
      ...runner, "dukascopy-node",
      "--instrument", args.symbol,
      "--from", args.from,
      "--to", to,
      "--timeframe", "m1",
      "--format", "json",
      "--file-name", "dukascopy-raw",
      "--directory", ".",
      "--cache",
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const stderr = new TextDecoder().decode(proc.stderr);
  if (proc.exitCode !== 0) {
    throw new Error(
      `dukascopy-node failed:\n${stderr.split("\n").slice(-8).join("\n")}\n\n` +
        `If the instrument name was rejected, the Nasdaq-100 CFD is usually\n` +
        `'usa100idxusd'; the error above normally lists what it will accept.\n` +
        `If ${runner[0]} itself was not found, install Node (nodejs.org) or Bun.`,
    );
  }

  const raw = await Bun.file("dukascopy-raw.json").json();
  if (!Array.isArray(raw)) throw new Error("dukascopy-raw.json was not an array of bars.");
  return (raw as { timestamp: number; open: number; high: number; low: number; close: number; volume?: number }[])
    .map((bar) => ({
      time: bar.timestamp,
      open: bar.open, high: bar.high, low: bar.low, close: bar.close,
      ...(bar.volume === undefined ? {} : { volume: bar.volume }),
    }));
}

// ---------------------------------------------------------------------

/**
 * Say what actually arrived, in the terms the model cares about.
 *
 * A fetch that returns a plausible-looking file covering the wrong hours is the
 * failure worth catching here: without candles around 10:00 ET there is nothing
 * for the model to read, and `explain` would just report nothing on every day.
 */
function summarise(candles: Candle[]): void {
  const first = candles[0]!;
  const last = candles[candles.length - 1]!;
  const dates = new Set(candles.map((c) => toEt(c.time).date));
  const withKeyOpen = new Set(
    candles.filter((c) => toEt(c.time).minuteOfDay === 600).map((c) => toEt(c.time).date),
  );
  const withAccumulation = new Set(
    candles
      .filter((c) => {
        const m = toEt(c.time).minuteOfDay;
        return m >= 570 && m < 600;
      })
      .map((c) => toEt(c.time).date),
  );

  console.log(`\n  ${candles.length} candles, ${dates.size} ET dates`);
  console.log(`  ${toEt(first.time).date} → ${toEt(last.time).date}`);
  console.log(`  dates with a 10:00 ET candle        ${withKeyOpen.size} / ${dates.size}`);
  console.log(`  dates with 09:30–10:00 coverage     ${withAccumulation.size} / ${dates.size}`);

  if (withKeyOpen.size === 0) {
    console.log(
      `\n  ⚠ NOT ONE candle opens at 10:00 ET. Either the timestamps are wrong or\n` +
        `    the interval does not divide the hour. The model has nothing to read.`,
    );
  } else if (withKeyOpen.size < dates.size * 0.6) {
    console.log(
      `\n  ⚠ Most dates have no 10:00 ET candle. Check the interval — the key open\n` +
        `    has to fall on a bar boundary, so 1m/5m/15m/30m work and 7m does not.`,
    );
  }

  const usable = withAccumulation.size;
  const verdict =
    usable < 60 ? "reading individual days with `explain`. No statistics."
    : usable < 120 ? "a first look. Far too few trades to conclude anything."
    : usable < 250 ? "a backtest worth running, still thin for a parameter search."
    : "enough for walk-forward, if the out-of-sample folds clear 30 trades.";
  console.log(`\n  ${usable} usable sessions → ${verdict}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.source === "json" && !args.json) throw new Error("--source json needs --json <file>.");
  console.log(
    args.source === "json"
      ? `json · ${args.json}`
      : `${args.source} · ${args.symbol} · ${args.source === "yahoo" ? args.interval : "m1"}`,
  );

  const candles =
    args.source === "json"
      ? parseYahooChart(await Bun.file(args.json!).json())
      : args.source === "yahoo"
        ? await fetchYahoo(args)
        : await fetchDukascopy(args);
  if (candles.length === 0) throw new Error("No candles came back. Nothing was written.");

  candles.sort((a, b) => a.time - b.time);
  await Bun.write(args.out, `${toCsv(candles)}\n`);
  console.log(`\n  → ${args.out}`);
  summarise(candles);

  console.log(
    `\nNext:\n` +
      `  bun run src/cli.ts explain  ${args.out}\n` +
      `  bun run src/cli.ts backtest ${args.out}\n` +
      `  bun run src/cli.ts ablate   ${args.out}`,
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
