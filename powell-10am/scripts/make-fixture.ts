#!/usr/bin/env bun
/**
 * Generates `fixtures/sample-1m.csv`.
 *
 * THIS IS SYNTHETIC DATA. It exists so the CLI can be exercised end to end
 * without shipping licensed market data, and so the pipeline has something to
 * chew on in CI. Statistics produced from it describe this generator, not the
 * market — do not read anything into them. Point the CLI at a real export
 * before drawing any conclusion about the model.
 *
 *   bun run scripts/make-fixture.ts [days]
 */

import { toCsv } from "../src/csv.js";
import { toEt } from "../src/time.js";
import type { Candle } from "../src/types.js";

/**
 * The UTC epoch at which New York's wall clock reads `hhmm` on `dateIso`.
 *
 * A fixed -05:00 offset is wrong for half the year: after the March
 * transition it puts the session an hour out, and the model — which correctly
 * follows the wall clock — then finds no candle at the key open at all.
 */
function etEpoch(dateIso: string, hhmm: string): number {
  for (const offset of ["-05:00", "-04:00"]) {
    const epoch = Date.parse(`${dateIso}T${hhmm}:00${offset}`);
    if (Number.isNaN(epoch)) continue;
    const et = toEt(epoch);
    const rendered = `${String(et.hour).padStart(2, "0")}:${String(et.minute).padStart(2, "0")}`;
    if (et.date === dateIso && rendered === hhmm) return epoch;
  }
  throw new Error(`no ET epoch for ${dateIso} ${hhmm}`);
}

/** Mulberry32 — small, seeded, and reproducible across runs. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = rng(20260729);

function candle(time: number, open: number, high: number, low: number, close: number): Candle {
  return {
    time,
    open: round(open),
    high: round(Math.max(high, open, close)),
    low: round(Math.min(low, open, close)),
    close: round(close),
    volume: Math.floor(500 + random() * 2000),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * One session, 09:30–16:00 ET at 1-minute resolution.
 *
 * Each day is assigned a regime so the dataset contains the three cases the
 * model must handle: a clean raid-and-reverse, a raid that keeps going (the
 * trade that should lose), and a day that never raids anything at all.
 */
function buildDay(dateIso: string, startPrice: number): Candle[] {
  const candles: Candle[] = [];
  const base = etEpoch(dateIso, "09:30");

  const roll = random();
  const regime = roll < 0.45 ? "reversal" : roll < 0.75 ? "continuation" : "quiet";
  const scale = 0.6 + random() * 0.8;

  let price = startPrice;
  const path: number[] = [];

  // 09:30–10:00 — accumulation, a two-sided range.
  const rangeHigh = startPrice + 4 * scale;
  const rangeLow = startPrice - 4 * scale;
  for (let i = 0; i < 30; i++) {
    const phase = Math.sin((i / 30) * Math.PI * 2);
    path.push(startPrice + phase * 4 * scale + (random() - 0.5) * 0.4);
  }
  price = path[path.length - 1] as number;

  // 10:00–10:30 — the raid, or nothing.
  const raidLow = random() < 0.5;
  const raidTarget = raidLow ? rangeLow - 0.8 * scale : rangeHigh + 0.8 * scale;

  if (regime === "quiet") {
    for (let i = 0; i < 30; i++) path.push(price + (random() - 0.5) * 0.5);
  } else {
    for (let i = 0; i < 8; i++) {
      path.push(price + ((raidTarget - price) * (i + 1)) / 8 + (random() - 0.5) * 0.2);
    }
    price = raidTarget;

    if (regime === "reversal") {
      // Displace back through the open, retrace, then expand.
      const reclaim = startPrice + (raidLow ? 2.5 : -2.5) * scale;
      for (let i = 0; i < 5; i++) path.push(price + ((reclaim - price) * (i + 1)) / 5);
      const pullback = price + (reclaim - price) * 0.35;
      for (let i = 0; i < 8; i++) path.push(reclaim + ((pullback - reclaim) * (i + 1)) / 8);
      price = pullback;
      const objective = raidTarget + (reclaim - raidTarget) * (2 + random() * 2);
      for (let i = 0; i < 9; i++) path.push(price + ((objective - price) * (i + 1)) / 9);
      price = objective;
    } else {
      // The raid keeps going: whoever faded it is wrong.
      const extension = raidTarget + (raidLow ? -6 : 6) * scale;
      for (let i = 0; i < 22; i++) path.push(raidTarget + ((extension - raidTarget) * (i + 1)) / 22);
      price = extension;
    }
  }

  // Fill the rest of the session with a drift.
  while (path.length < 390) {
    price += (random() - 0.5) * 0.6 * scale;
    path.push(price);
  }

  for (let i = 0; i < 390; i++) {
    const open = path[Math.max(0, i - 1)] as number;
    const close = path[i] as number;
    const wick = 0.05 + random() * 0.35 * scale;
    candles.push(candle(base + i * 60_000, open, Math.max(open, close) + wick, Math.min(open, close) - wick, close));
  }

  return candles;
}

function main(): void {
  const days = Number(process.argv[2] ?? 120);
  const candles: Candle[] = [];

  let price = 20000;
  const cursor = new Date(Date.UTC(2026, 0, 5)); // Monday 5 January 2026

  for (let produced = 0; produced < days; ) {
    const weekday = cursor.getUTCDay();
    if (weekday >= 1 && weekday <= 5) {
      const dateIso = cursor.toISOString().slice(0, 10);
      const day = buildDay(dateIso, price);
      candles.push(...day);
      price = (day[day.length - 1] as Candle).close;
      produced++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const path = new URL("../fixtures/sample-1m.csv", import.meta.url).pathname;
  Bun.write(path, toCsv(candles));
  console.log(`Wrote ${candles.length} synthetic candles across ${days} sessions to ${path}`);
  console.log("Reminder: synthetic data. Any statistics from it describe the generator, not the market.");
}

main();
