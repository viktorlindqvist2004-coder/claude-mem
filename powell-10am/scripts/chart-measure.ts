#!/usr/bin/env bun
/**
 * Measure OHLC off a chart screenshot by counting pixels.
 *
 * ## Why this exists
 *
 * Reading prices off a chart by eye is worse than it feels. On 10 July 2026 an
 * axis read of a 5-minute NAS100 screenshot produced this:
 *
 *     "raid of the highs to ~29,763, clearing the 29,758 window high by 5 pts"
 *
 * Measured by pixel, the highest post-10:00 wick was 29,754.3 against a window
 * high of 29,757.7. The highs were never taken. The eye had not merely been
 * imprecise about the margin — it had the **sign** wrong, which inverted the
 * direction of the whole setup. The window itself was read to within 3 points,
 * so the failure was specific: eyeballing gets ranges right and gets the
 * relationships *between individual candles* wrong, and the model turns
 * entirely on those relationships.
 *
 * ## What it does and does not automate
 *
 * The split is deliberate. An assistant reads *text* reliably and *geometry*
 * badly, so:
 *
 *   - you (or the assistant) read the axis labels — actual characters
 *   - this script measures every pixel distance
 *
 * Hence the two-step flow. First discover the landmarks:
 *
 *     bun run scripts/chart-measure.ts shot.png --calibrate
 *
 * That prints the y-centres of the price-axis label blocks and the x-centres of
 * the time-axis labels. Read two price labels and two time labels off the image
 * yourself, then measure:
 *
 *     bun run scripts/chart-measure.ts shot.png \
 *       --price 1549=29700 --price 1899=29500 \
 *       --time 790.5=10:00 --time 1091.5=11:00 \
 *       --minutes 5 --from 09:30 --to 11:00
 *
 * Add `--csv day.csv --date 2026-07-10` to write candles the rest of the CLI can
 * read, at which point `explain` and `levels` work on a screenshot.
 *
 * ## Two traps this has already fallen into
 *
 * **Do not calibrate from the price tags.** Their borders are exact pixel rows
 * and their values are printed right there, which makes them look like the best
 * possible anchor. But TradingView pushes overlapping tags apart, and a stack of
 * four gave 2.108 px/point against the gridlines' true 1.75 — a 20% scale error.
 * Calibrate from gridline labels, which do not move, and prefer two that are far
 * apart.
 *
 * **A horizontal drawn level is the same black as a wick.** Left in, it becomes
 * the low of every candle it crosses. `--exclude-level` removes it by fitting
 * the thin run that persists across columns where no candle sits.
 *
 * ## The self-check that makes the output trustworthy
 *
 * Candle direction comes from the body's interior shade, and which shade means
 * "up" is decided by *chaining*: on a continuous intraday series each candle's
 * open equals the previous candle's close. The script tries both assignments and
 * keeps the one with the smaller chaining residual, then reports it. On the
 * 10 July chart the winning residual was well under a point per candle while the
 * loser was tens of points, so the assignment is not a guess.
 *
 * **Read the residual before believing the numbers.** A large one means the
 * pitch or phase is wrong — usually `--time` off by one candle — and every OHLC
 * below it is then wrong in a way that looks perfectly plausible.
 *
 * ffmpeg supplies the pixels; resolution is the same as `video-frames.ts`.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------
// pixels
// ---------------------------------------------------------------------

async function resolveFfmpeg(explicit?: string): Promise<string> {
  const candidates: string[] = [];
  if (explicit) candidates.push(explicit);
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
  try {
    const mod = (await import("ffmpeg-static")) as { default?: string };
    if (mod.default) candidates.push(mod.default);
  } catch {
    // Not installed beside this script; the other candidates may still work.
  }
  candidates.push(join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"));
  for (const candidate of candidates) if (candidate && existsSync(candidate)) return candidate;
  const which = Bun.spawnSync(["which", "ffmpeg"]);
  const found = new TextDecoder().decode(which.stdout).trim();
  if (found) return found;
  throw new Error("ffmpeg not found. Install it with:  npm install ffmpeg-static --no-save");
}

interface Image {
  width: number;
  height: number;
  data: Uint8Array;
}

async function loadImage(path: string, ffmpeg: string): Promise<Image> {
  const probe = Bun.spawnSync([ffmpeg, "-i", path, "-f", "null", "-"], { stderr: "pipe" });
  const text = new TextDecoder().decode(probe.stderr);
  const match = text.match(/,\s(\d{2,5})x(\d{2,5})[,\s]/);
  if (!match) throw new Error(`Could not read the dimensions of ${path}`);
  const width = Number(match[1]);
  const height = Number(match[2]);

  const raw = Bun.spawnSync(
    [ffmpeg, "-loglevel", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    { stdout: "pipe", stderr: "pipe", maxBuffer: width * height * 3 + 1024 },
  );
  const data = new Uint8Array(raw.stdout);
  if (data.length < width * height * 3) {
    throw new Error(
      `Expected ${width * height * 3} bytes of pixels, got ${data.length}. ` +
        new TextDecoder().decode(raw.stderr).slice(0, 300),
    );
  }
  return { width, height, data };
}

const rgb = (img: Image, x: number, y: number): [number, number, number] => {
  const i = (y * img.width + x) * 3;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!];
};
const lum = (img: Image, x: number, y: number) => {
  const [r, g, b] = rgb(img, x, y);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

/** The most common colour in a region — the chart background. */
function backgroundLum(img: Image, x0: number, x1: number, y0: number, y1: number): number {
  const counts = new Map<number, number>();
  for (let y = y0; y < y1; y += 3) {
    for (let x = x0; x < x1; x += 3) {
      const key = Math.round(lum(img, x, y));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let best = 0;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

/** Contiguous runs of ink in one column, as inclusive [start, end] pairs. */
function darkRuns(img: Image, x: number, y0: number, y1: number, threshold: number): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  for (let y = y0; y < y1; y++) {
    const dark = lum(img, x, y) < threshold;
    if (dark && start === -1) start = y;
    if (!dark && start !== -1) {
      runs.push([start, y - 1]);
      start = -1;
    }
  }
  if (start !== -1) runs.push([start, y1 - 1]);
  return runs;
}

/** Group adjacent indices into blocks, so label glyphs become one entry each. */
function blocks(values: number[], gap: number): number[][] {
  const out: number[][] = [];
  for (const value of values) {
    const last = out[out.length - 1];
    if (last && value - last[last.length - 1]! <= gap) last.push(value);
    else out.push([value]);
  }
  return out;
}

// ---------------------------------------------------------------------
// calibration
// ---------------------------------------------------------------------

interface Args {
  image: string;
  calibrate: boolean;
  prices: { y: number; price: number }[];
  times: { x: number; minutes: number }[];
  minutes: number;
  from?: number;
  to?: number;
  plotRight?: number;
  plotTop?: number;
  plotBottom?: number;
  excludeLevel: boolean;
  csv?: string;
  date?: string;
  ffmpeg?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    image: "",
    calibrate: false,
    prices: [],
    times: [],
    minutes: 5,
    excludeLevel: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    const next = () => argv[++i]!;
    if (!token.startsWith("--")) {
      if (!args.image) args.image = token;
      continue;
    }
    switch (token) {
      case "--calibrate": args.calibrate = true; break;
      case "--price": {
        const [y, price] = next().split("=");
        args.prices.push({ y: Number(y), price: Number(price) });
        break;
      }
      case "--time": {
        const [x, clock] = next().split("=");
        args.times.push({ x: Number(x), minutes: toMinutes(clock!) });
        break;
      }
      case "--minutes": args.minutes = Number(next()); break;
      case "--from": args.from = toMinutes(next()); break;
      case "--to": args.to = toMinutes(next()); break;
      case "--plot-right": args.plotRight = Number(next()); break;
      case "--plot-top": args.plotTop = Number(next()); break;
      case "--plot-bottom": args.plotBottom = Number(next()); break;
      case "--keep-level": args.excludeLevel = false; break;
      case "--csv": args.csv = next(); break;
      case "--date": args.date = next(); break;
      case "--ffmpeg": args.ffmpeg = next(); break;
      default: throw new Error(`Unknown flag ${token}`);
    }
  }
  if (!args.image) throw new Error("Pass an image path.");
  return args;
}

/**
 * The UTC offset New York was actually on at that wall-clock moment, as `-04:00`
 * or `-05:00`.
 *
 * Written out rather than left implicit because a bare `2026-07-10T10:00:00` is
 * parsed as *local* time, and this container runs on UTC — which would move
 * every candle four hours and put the key open at 06:00 ET. The fixture
 * generator made precisely this mistake with a hard-coded `-05:00` and silently
 * lost the key-open candle on 75 of 120 days after the DST switch.
 */
function etOffset(date: string, minutes: number): string {
  const guess = new Date(`${date}T${toClock(minutes)}:00Z`);
  for (const offsetHours of [4, 5]) {
    const candidate = new Date(guess.getTime() + offsetHours * 3600_000);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(candidate);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const hour = get("hour") === "24" ? "00" : get("hour");
    const wall = `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
    if (wall === `${date}T${toClock(minutes)}`) return `-0${offsetHours}:00`;
  }
  throw new Error(`Could not resolve the New York offset for ${date} ${toClock(minutes)}`);
}

const toMinutes = (clock: string): number => {
  const [h, m] = clock.split(":");
  return Number(h) * 60 + Number(m ?? 0);
};
const toClock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Find the axis label blocks so a human can read values off two of them.
 *
 * Prints y-centres for the price axis (right-hand strip) and x-centres for the
 * time axis (bottom strip). Blocks 40+ px tall on the price axis are usually
 * floating price tags rather than gridline labels — they are flagged, because
 * calibrating from them is the 20%-error trap described at the top of this file.
 */
function calibrate(img: Image): void {
  const bg = backgroundLum(img, Math.round(img.width * 0.2), Math.round(img.width * 0.6), Math.round(img.height * 0.4), Math.round(img.height * 0.7));
  console.log(`background luminance ${bg}`);

  const axisX0 = Math.round(img.width * 0.86);
  const axisX1 = img.width - 4;
  const rows: number[] = [];
  for (let y = 4; y < img.height - 4; y++) {
    let ink = 0;
    for (let x = axisX0; x < axisX1; x++) if (Math.abs(lum(img, x, y) - bg) > 12) ink++;
    if (ink > 3) rows.push(y);
  }
  console.log(`\nPRICE AXIS  (x ${axisX0}–${axisX1})`);
  const priceBlocks = blocks(rows, 6).filter((b) => b.length >= 8);
  const centres: number[] = [];
  for (const b of priceBlocks) {
    const height = b[b.length - 1]! - b[0]! + 1;
    const centre = (b[0]! + b[b.length - 1]!) / 2;
    centres.push(centre);
    const flag = height >= 40 ? "  ← tall: probably a floating tag, do NOT calibrate from it" : "";
    console.log(`  y ${String(b[0]).padStart(4)}–${String(b[b.length - 1]).padEnd(4)} centre ${String(centre).padStart(6)}  height ${String(height).padStart(3)}${flag}`);
  }
  const steps = centres.slice(1).map((c, i) => c - centres[i]!).filter((d) => d > 20);
  if (steps.length > 0) {
    const sorted = [...steps].sort((a, b) => a - b);
    console.log(`  median spacing ${sorted[Math.floor(sorted.length / 2)]} px — gridlines should be evenly spaced`);
  }

  // Score every candidate strip rather than taking the first that has two
  // blocks in it: the chart body also produces two-block rows, and the first
  // match was landing on candles rather than on the axis. Real hour labels are
  // evenly spaced, so evenness is the signal that separates them.
  const bottom = img.height;
  console.log(`\nTIME AXIS  (best-scoring horizontal strip)`);
  let best: { y0: number; labels: number[][]; score: number } | null = null;
  for (let y0 = Math.round(bottom * 0.7); y0 < bottom - 30; y0 += 8) {
    const cols: number[] = [];
    for (let x = 4; x < Math.round(img.width * 0.9); x++) {
      let ink = 0;
      for (let y = y0; y < y0 + 40 && y < bottom; y++) if (Math.abs(lum(img, x, y) - bg) > 12) ink++;
      if (ink > 0) cols.push(x);
    }
    const labels = blocks(cols, 12).filter((b) => b.length >= 8 && b.length <= 200);
    if (labels.length < 3) continue;
    const centres = labels.map((b) => (b[0]! + b[b.length - 1]!) / 2);
    const gaps = centres.slice(1).map((c, i) => c - centres[i]!);
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const spread = Math.max(...gaps.map((g) => Math.abs(g - mean))) / mean;
    const score = labels.length - spread * 10;
    if (!best || score > best.score) best = { y0, labels, score };
  }
  if (!best) {
    console.log("  no evenly spaced label row found — read --time positions off the image by eye");
  } else {
    console.log(`  strip y ${best.y0}–${best.y0 + 40}`);
    for (const b of best.labels) {
      console.log(`    x ${String(b[0]).padStart(4)}–${String(b[b.length - 1]).padEnd(4)} centre ${((b[0]! + b[b.length - 1]!) / 2).toFixed(1)}`);
    }
  }

  console.log(
    `\nNext: read two price labels and two time labels off the image, then\n` +
      `  --price <y>=<price> --price <y>=<price> --time <x>=HH:MM --time <x>=HH:MM`,
  );
}

// ---------------------------------------------------------------------
// measurement
// ---------------------------------------------------------------------

interface Measured {
  minutes: number;
  x: number;
  high: number;
  low: number;
  bodyTop: number;
  bodyBottom: number;
  interior: number;
}

function measure(img: Image, args: Args): { candles: Measured[]; scale: number; residual: number; upIsBright: boolean } {
  if (args.prices.length < 2) throw new Error("Two --price anchors are required.");
  if (args.times.length < 2) throw new Error("Two --time anchors are required.");

  const [p0, p1] = [args.prices[0]!, args.prices[1]!];
  const ptPerPx = (p0.price - p1.price) / (p1.y - p0.y);
  const price = (y: number) => p0.price - (y - p0.y) * ptPerPx;

  const [t0, t1] = [args.times[0]!, args.times[1]!];
  const pxPerMinute = (t1.x - t0.x) / (t1.minutes - t0.minutes);
  const pitch = pxPerMinute * args.minutes;
  const xAt = (minutes: number) => t0.x + (minutes - t0.minutes) * pxPerMinute;

  // The plot box must exclude chrome, and on a phone screenshot there is a lot
  // of it: a floating toolbar across the top, a scroll-to-realtime button, a
  // watermark, the timeframe list. Every one of those is dark ink in a column
  // and becomes a candle extreme if it is inside the box — which is exactly how
  // this first produced a high of 30,582.9 for twenty consecutive candles.
  const plotTop = args.plotTop ?? 4;
  const plotBottom = args.plotBottom ?? Math.round(img.height * 0.78);
  const plotRight = args.plotRight ?? Math.round(img.width * 0.85);
  const bg = backgroundLum(img, Math.round(img.width * 0.2), Math.round(img.width * 0.6), Math.round(img.height * 0.4), Math.round(img.height * 0.7));
  const threshold = bg - 18;

  // Fit the drawn horizontal level, if any: the thin run that appears at nearly
  // the same y in columns with no candle. Left in, it becomes every candle's low.
  let levelAt: ((x: number) => number) | null = null;
  if (args.excludeLevel) {
    const samples: { x: number; y: number }[] = [];
    for (let x = 10; x < plotRight; x += 3) {
      const thin = darkRuns(img, x, plotTop, plotBottom, threshold).filter(([a, b]) => b - a + 1 <= 5);
      if (thin.length === 1) samples.push({ x, y: (thin[0]![0] + thin[0]![1]) / 2 });
    }
    if (samples.length > 30) {
      const n = samples.length;
      const sx = samples.reduce((s, p) => s + p.x, 0) / n;
      const sy = samples.reduce((s, p) => s + p.y, 0) / n;
      const num = samples.reduce((s, p) => s + (p.x - sx) * (p.y - sy), 0);
      const den = samples.reduce((s, p) => s + (p.x - sx) ** 2, 0);
      const slope = den === 0 ? 0 : num / den;
      const spread = Math.max(...samples.map((p) => Math.abs(p.y - (sy + slope * (p.x - sx)))));
      if (spread < 8) levelAt = (x: number) => sy + slope * (x - sx);
    }
  }

  const from = args.from ?? t0.minutes;
  const to = args.to ?? t1.minutes;
  const half = Math.max(2, Math.floor(pitch / 2) - 3);
  const candles: Measured[] = [];

  for (let minutes = from; minutes <= to; minutes += args.minutes) {
    const centre = Math.round(xAt(minutes));
    if (centre - half < 0 || centre + half >= plotRight) continue;
    let top = Infinity;
    let bottom = -Infinity;
    let bodyTop = Infinity;
    let bodyBottom = -Infinity;
    const interiors: number[] = [];

    for (let x = centre - half; x <= centre + half; x++) {
      for (const [a, b] of darkRuns(img, x, plotTop, plotBottom, threshold)) {
        const thickness = b - a + 1;
        if (levelAt && thickness <= 6 && Math.abs((a + b) / 2 - levelAt(x)) < 6) continue;
        top = Math.min(top, a);
        bottom = Math.max(bottom, b);
        if (thickness > 6 && Math.abs(x - centre) >= 4) {
          bodyTop = Math.min(bodyTop, a);
          bodyBottom = Math.max(bodyBottom, b);
          interiors.push(lum(img, x, Math.round((a + b) / 2)));
        }
      }
    }
    if (top === Infinity) continue;
    if (bodyTop === Infinity) {
      bodyTop = top;
      bodyBottom = bottom;
    }
    interiors.sort((a, b) => a - b);
    candles.push({
      minutes,
      x: centre,
      high: price(top),
      low: price(bottom),
      bodyTop: price(bodyTop),
      bodyBottom: price(bodyBottom),
      interior: interiors[Math.floor(interiors.length / 2)] ?? 0,
    });
  }

  // Which interior shade means "up"? Decide by chaining, not by assumption:
  // on a continuous series each open equals the previous close.
  const shades = [...new Set(candles.map((c) => Math.round(c.interior)))].sort((a, b) => a - b);
  const split = shades.length > 1 ? (shades[0]! + shades[shades.length - 1]!) / 2 : Infinity;
  const chainError = (upIsBright: boolean): number => {
    let total = 0;
    let count = 0;
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1]!;
      const cur = candles[i]!;
      const closeOf = (c: Measured) => (c.interior > split === upIsBright ? c.bodyTop : c.bodyBottom);
      const openOf = (c: Measured) => (c.interior > split === upIsBright ? c.bodyBottom : c.bodyTop);
      total += Math.abs(openOf(cur) - closeOf(prev));
      count++;
    }
    return count === 0 ? 0 : total / count;
  };
  const brightUp = chainError(true);
  const brightDown = chainError(false);
  const upIsBright = brightUp <= brightDown;

  return { candles, scale: 1 / ptPerPx, residual: Math.min(brightUp, brightDown), upIsBright };
}

// ---------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.image)) throw new Error(`No such file: ${args.image}`);
  const img = await loadImage(args.image, await resolveFfmpeg(args.ffmpeg));
  console.log(`${args.image}  ${img.width}x${img.height}`);

  if (args.calibrate || args.prices.length < 2 || args.times.length < 2) {
    calibrate(img);
    return;
  }

  const { candles, scale, residual, upIsBright } = measure(img, args);
  const split = (() => {
    const shades = [...new Set(candles.map((c) => Math.round(c.interior)))].sort((a, b) => a - b);
    return shades.length > 1 ? (shades[0]! + shades[shades.length - 1]!) / 2 : Infinity;
  })();
  const isUp = (c: Measured) => c.interior > split === upIsBright;

  console.log(`scale ${scale.toFixed(3)} px per point`);
  console.log(
    `direction: ${upIsBright ? "brighter" : "darker"} body interior = up  ` +
      `(open/close chaining residual ${residual.toFixed(2)} pts per candle)`,
  );
  if (residual > 3) {
    console.log(
      `  ⚠ residual over 3 points. The candle pitch or phase is probably wrong —\n` +
        `    check --time is naming the right candle. Every price below is then\n` +
        `    wrong in a way that still looks plausible.`,
    );
  }

  console.log(`\ntime \topen\t\thigh\t\tlow\t\tclose`);
  const rows: string[] = [];
  for (const c of candles) {
    const open = isUp(c) ? c.bodyBottom : c.bodyTop;
    const close = isUp(c) ? c.bodyTop : c.bodyBottom;
    console.log(
      `${toClock(c.minutes)}\t${open.toFixed(1)}\t${c.high.toFixed(1)}\t${c.low.toFixed(1)}\t${close.toFixed(1)}`,
    );
    if (args.csv && args.date) {
      const stamp = `${args.date}T${toClock(c.minutes)}:00${etOffset(args.date, c.minutes)}`;
      rows.push(`${stamp},${open.toFixed(2)},${c.high.toFixed(2)},${c.low.toFixed(2)},${close.toFixed(2)},0`);
    }
  }

  if (args.csv) {
    if (!args.date) throw new Error("--csv needs --date YYYY-MM-DD to timestamp the rows.");
    await Bun.write(args.csv, `time,open,high,low,close,volume\n${rows.join("\n")}\n`);
    console.log(
      `\n${rows.length} candles → ${args.csv}\n` +
        `Timestamps carry New York's real UTC offset for that date, so the engine reads\n` +
        `the wall clock correctly across the DST boundary.\n\n` +
        `These are NOT market data. One pixel is ${(1 / scale).toFixed(2)} points here, so treat every\n` +
        `price as ±${(1 / scale).toFixed(2)} at best and never quote them as exact. Journal anything\n` +
        `measured this way with source "pixel", not "data".`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
