#!/usr/bin/env bun
/**
 * One line per trading day: what the model saw, which gate stopped it, and the R.
 *
 * `explain` narrates a single day in prose, which is the right shape for reading
 * one day and the wrong shape for reading fifty. This produces a table you can
 * scan for pattern — which gate dominates, whether the rejections cluster on
 * particular weekdays, how near the misses were.
 *
 *   bun run scripts/day-report.ts data.csv [--out report.md] [any config flags]
 *
 * R is reported twice on purpose. **Planned** R is the geometry the setup
 * offered; **realised** R is what the simulated trade actually returned, and the
 * gap between them is where no-fills live. A model with excellent planned R and
 * no fills has produced nothing, and only showing planned R would hide that.
 */

import { loadCsvFile } from "../src/csv.js";
import { readDay } from "../src/model.js";
import { simulate } from "../src/trade.js";
import { makeConfig, type ModelConfig } from "../src/spec.js";
import { groupByEtDate, toEt } from "../src/time.js";
import type { Candle } from "../src/types.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Row {
  date: string;
  weekday: string;
  keyOpen: number | null;
  rangeHigh: number | null;
  rangeLow: number | null;
  raid: string;
  gate: string;
  detail: string;
  direction: string;
  plannedR: number | null;
  result: string;
  realisedR: number | null;
}

/**
 * Name the gate from the engine's rejection sentence.
 *
 * Matching on the message rather than a code because `rejectedReason` is prose
 * by design — it is what the user reads. Anything unmatched falls through as
 * "other" rather than being silently bucketed somewhere plausible.
 */
function gateOf(reason: string | null | undefined): string {
  if (!reason) return "—";
  if (reason.includes("no candle at the key open")) return "no-data";
  if (reason.includes("liquidity sweep")) return "no-raid";
  if (reason.includes("displacement")) return "displacement";
  if (reason.includes("fair value gap") || reason.includes("gap")) return "imbalance";
  if (reason.includes("R floor") || reason.includes("below the")) return "reward:risk";
  if (reason.includes("entry")) return "entry";
  if (reason.includes("bias")) return "bias";
  if (reason.includes("SMT")) return "smt";
  if (reason.includes("weekday")) return "weekday";
  return "other";
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const path = argv.find((a) => !a.startsWith("--"));
  if (!path) throw new Error("Usage: bun run scripts/day-report.ts <csv> [--out report.md]");
  const outIndex = argv.indexOf("--out");
  const out = outIndex === -1 ? null : argv[outIndex + 1]!;

  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (!token.startsWith("--") || token === "--out") continue;
    flags[token.slice(2)] = argv[i + 1] ?? "true";
  }
  const config: ModelConfig = makeConfig(flags as never);

  const { candles } = await loadCsvFile(path);
  const dates = [...groupByEtDate(candles).keys()].sort();
  const rows: Row[] = [];

  for (const date of dates) {
    const { read, setup } = readDay(candles, date, config);
    const trade = setup ? simulate(candles, setup, config) : null;
    const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? "?";

    rows.push({
      date,
      weekday,
      keyOpen: read.keyOpen?.price ?? null,
      rangeHigh: read.accumulation?.high ?? null,
      rangeLow: read.accumulation?.low ?? null,
      raid: read.manipulation
        ? `${read.manipulation.side === "low" ? "lows" : "highs"} @ ${read.manipulation.level.toFixed(1)} (${read.manipulation.source})`
        : "—",
      gate: setup ? "SETUP" : gateOf(read.rejectedReason),
      detail: setup ? (setup.entryLabel ?? "") : (read.rejectedReason ?? ""),
      direction: setup?.direction ?? read.bias ?? "—",
      plannedR: setup?.plannedR ?? null,
      result: trade ? trade.outcome : setup ? "no-fill" : "—",
      realisedR: trade && trade.outcome !== "no-fill" ? trade.r : null,
    });
  }

  const lines: string[] = [];
  const p = (s: string) => lines.push(s);

  p(`# Day-by-day report`);
  p("");
  p(`\`${path}\` · ${rows.length} trading dates · ${new Date().toISOString().slice(0, 10)}`);
  p("");

  const traded = rows.filter((r) => r.realisedR !== null);
  const setups = rows.filter((r) => r.gate === "SETUP");
  const totalR = traded.reduce((sum, r) => sum + (r.realisedR ?? 0), 0);
  p(`**${setups.length} setups**, ${traded.length} filled, ` +
    `total **${totalR >= 0 ? "+" : ""}${totalR.toFixed(2)}R**`);
  p("");

  // Which gate stopped how many days — the shape of the funnel.
  const gates = new Map<string, number>();
  for (const row of rows) gates.set(row.gate, (gates.get(row.gate) ?? 0) + 1);
  p(`## Where the days went`);
  p("");
  p(`| Outcome | Days | Share |`);
  p(`|---|---:|---:|`);
  for (const [gate, count] of [...gates].sort((a, b) => b[1] - a[1])) {
    p(`| ${gate} | ${count} | ${((count / rows.length) * 100).toFixed(0)}% |`);
  }
  p("");

  p(`## Every day`);
  p("");
  p(`| Date | Day | Key open | 09:30–10:00 range | Raid | Outcome | Dir | Planned R | Result | R |`);
  p(`|---|---|---:|---|---|---|---|---:|---|---:|`);
  for (const r of rows) {
    const range =
      r.rangeHigh !== null && r.rangeLow !== null
        ? `${r.rangeLow.toFixed(1)}–${r.rangeHigh.toFixed(1)} (${(r.rangeHigh - r.rangeLow).toFixed(0)})`
        : "—";
    p(
      `| ${r.date} | ${r.weekday} | ${r.keyOpen?.toFixed(1) ?? "—"} | ${range} | ${r.raid} | ` +
        `${r.gate === "SETUP" ? "**SETUP**" : r.gate} | ${r.direction} | ` +
        `${r.plannedR?.toFixed(2) ?? "—"} | ${r.result} | ` +
        `${r.realisedR === null ? "—" : (r.realisedR >= 0 ? "+" : "") + r.realisedR.toFixed(2)} |`,
    );
  }
  p("");

  p(`## Why each day was declined`);
  p("");
  for (const r of rows) {
    if (r.gate === "SETUP") {
      p(`- **${r.date}** — SETUP, ${r.direction}, ${r.detail}, planned ${r.plannedR?.toFixed(2)}R → ` +
        `${r.result}${r.realisedR === null ? "" : ` (${r.realisedR >= 0 ? "+" : ""}${r.realisedR.toFixed(2)}R)`}`);
    } else if (r.gate !== "no-data") {
      p(`- ${r.date} — ${r.detail}`);
    }
  }

  const text = lines.join("\n") + "\n";
  if (out) {
    await Bun.write(out, text);
    console.log(`${rows.length} dates → ${out}`);
  } else {
    console.log(text);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
