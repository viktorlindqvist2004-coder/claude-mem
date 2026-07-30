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
 * ## Traps this has already fallen into
 *
 * **Do not calibrate from the price tags.** Their borders are exact pixel rows
 * and their values are printed right there, which makes them look like the best
 * possible anchor. But TradingView pushes overlapping tags apart, and a stack of
 * four gave 2.108 px/point against the gridlines' true 1.75 — a 20% scale error.
 * Calibrate from gridline labels, which do not move, and prefer two that are far
 * apart. `--calibrate` flags the tall blocks that are tags.
 *
 * **Dark lines that cross the chart are the same ink as a wick** — a drawn level,
 * or a moving average plotted in black. They are removed by tracing: a thin run
 * belongs to a line if thin runs sit at a similar height eight columns either
 * side, which a two-pixel-wide wick cannot manage. Pass `--keep-level` to
 * disable. On the 8 July chart the black MA sat *above every candle*, so without
 * this every column would have reported the same high.
 *
 * **Set the plot box explicitly.** A phone screenshot is full of dark chrome —
 * floating toolbar, scroll-to-realtime button, watermark, an indicator pane. Any
 * of it inside the box becomes a candle extreme; the toolbar once supplied the
 * high for twenty consecutive candles. `--plot-top` / `--plot-bottom` /
 * `--plot-right`, and the tool warns when ink touches an edge.
 *
 * ## The self-check that makes the output trustworthy
 *
 * Direction comes from which of the two body fills covers more of a candle, and
 * which fill means "up" is decided by *chaining*: on a continuous series each
 * open equals the previous close. Both assignments are scored and the better one
 * is reported along with the score it beat.
 *
 * **Read the residual before believing anything.** Around one pixel's worth of
 * points is the floor and means the reading is as good as the image allows.
 * Much more than that usually means `--time` names the wrong candle, `--minutes`
 * disagrees with the chart's timeframe, or chrome is inside the box — and the
 * prices will then be wrong in a way that still looks entirely plausible.
 *
 * A caveat on the residual, from 8 July: a real feed genuinely gaps between
 * candles, and three gaps of 8–20 points there held the average at 11 px however
 * correct the reading was. So judge it by the *separation* between the two
 * assignments as well as its absolute size, and remember that gaps move opens
 * and closes only — highs and lows come from wick extremes and are unaffected.
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
  /** How many pixels of each dark shade the body contains. */
  shades: Map<number, number>;
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

  /**
   * Identify pixels belonging to a dark line that runs *across* the chart —
   * a drawn level, or a moving average plotted in black. Those are the same ink
   * as a wick, so left in they become the high or low of every candle they pass.
   *
   * Traced rather than fitted. A straight-line fit handled a horizontal level
   * but not a black moving average, which curves; and on the 8 July chart that
   * MA sat above every candle, so failing to remove it would have handed every
   * column the same high. The test is continuity instead: a thin run is part of
   * a line if thin runs sit at a similar height eight columns to the left *and*
   * eight to the right. A wick is only two or three columns wide, so it cannot.
   */
  const linePixels = new Set<number>();
  if (args.excludeLevel) {
    const thinRuns = new Map<number, [number, number][]>();
    for (let x = 0; x < plotRight; x++) {
      thinRuns.set(
        x,
        darkRuns(img, x, plotTop, plotBottom, threshold).filter(([a, b]) => b - a + 1 <= 6),
      );
    }
    const nearby = (x: number, y: number) =>
      (thinRuns.get(x) ?? []).some(([a, b]) => Math.abs((a + b) / 2 - y) <= 4);
    for (let x = 0; x < plotRight; x++) {
      for (const [a, b] of thinRuns.get(x) ?? []) {
        const y = (a + b) / 2;
        const left = x - 8 < 0 || nearby(x - 8, y);
        const right = x + 8 >= plotRight || nearby(x + 8, y);
        if (left && right) for (let yy = a; yy <= b; yy++) linePixels.add(x * 10000 + yy);
      }
    }
  }
  const onLine = (x: number, a: number, b: number) => {
    for (let y = a; y <= b; y++) if (!linePixels.has(x * 10000 + y)) return false;
    return true;
  };

  const from = args.from ?? t0.minutes;
  const to = args.to ?? t1.minutes;
  const half = Math.max(2, Math.floor(pitch / 2) - 3);
  const candles: Measured[] = [];

  // A body is wide and a wick is narrow, so the body is found by counting how
  // many columns carry ink at each height — not by how thick the vertical run
  // is. Thickness was the first attempt and it fails on a doji: a body only a
  // few pixels tall looks exactly like a wick, so the candle lost its body
  // entirely and reported open = high, close = low.
  const bodyWidthFloor = Math.max(5, Math.round(pitch * 0.4));
  const clipped: string[] = [];

  for (let minutes = from; minutes <= to; minutes += args.minutes) {
    const centre = Math.round(xAt(minutes));
    if (centre - half < 0 || centre + half >= plotRight) continue;

    const inkCount = new Map<number, number>();
    for (let x = centre - half; x <= centre + half; x++) {
      for (const [a, b] of darkRuns(img, x, plotTop, plotBottom, threshold)) {
        if (b - a + 1 <= 6 && onLine(x, a, b)) continue;
        for (let y = a; y <= b; y++) inkCount.set(y, (inkCount.get(y) ?? 0) + 1);
      }
    }
    if (inkCount.size === 0) continue;

    const ys = [...inkCount.keys()].sort((a, b) => a - b);
    const bodyYs = ys.filter((y) => (inkCount.get(y) ?? 0) >= bodyWidthFloor);
    const top = ys[0]!;
    const bottom = ys[ys.length - 1]!;
    const bodyTop = bodyYs[0] ?? top;
    const bodyBottom = bodyYs[bodyYs.length - 1] ?? bottom;

    // Ink touching the edge of the box means the box is wrong — a button, a
    // toolbar, an indicator pane — not that the candle really reached there.
    if (top <= plotTop + 1 || bottom >= plotBottom - 1) clipped.push(toClock(minutes));

    // A histogram of the dark shades in the body, resolved into a direction
    // after every candle has been read.
    //
    // Not a single sample and not this candle's mode. Sampling at a chosen
    // offset landed on the body's outline, which is the same shade for up and
    // down candles. The per-candle mode then failed differently: TradingView
    // draws bodies in three shades — two fills and a darker outline — and on a
    // near-doji the outline is most of the body's area, so it won the mode and
    // that candle got sorted into a class of its own.
    const shades = new Map<number, number>();
    for (const y of bodyYs) {
      for (let x = centre - half + 4; x <= centre + half - 4; x++) {
        const value = lum(img, x, y);
        if (value >= threshold) continue;
        const key = Math.round(value);
        shades.set(key, (shades.get(key) ?? 0) + 1);
      }
    }

    candles.push({
      minutes,
      x: centre,
      high: price(top),
      low: price(bottom),
      bodyTop: price(bodyTop),
      bodyBottom: price(bodyBottom),
      shades,
    });
  }
  if (clipped.length > 0) {
    console.log(
      `  ⚠ ink reaches the edge of the plot box at ${clipped.join(", ")}.\n` +
        `    Those candles are clipped, not real — narrow --plot-top/--plot-bottom\n` +
        `    until this warning goes away.`,
    );
  }

  const fills = dominantFills(candles);
  const chainError = (upIsBrighter: boolean): number => {
    let total = 0;
    let count = 0;
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1]!;
      const cur = candles[i]!;
      total += Math.abs(openOf(cur, fills, upIsBrighter) - closeOf(prev, fills, upIsBrighter));
      count++;
    }
    return count === 0 ? 0 : total / count;
  };
  const brighterUp = chainError(true);
  const brighterDown = chainError(false);
  const upIsBrighter = brighterUp <= brighterDown;

  return {
    candles,
    scale: 1 / ptPerPx,
    residual: Math.min(brighterUp, brighterDown),
    rejected: Math.max(brighterUp, brighterDown),
    upIsBrighter,
    fills,
  };
}

/**
 * The two fill shades used for up and down candles, as [darker, brighter].
 *
 * Chosen by total pixel area across every candle, which is what excludes the
 * body outline: the outline is a third shade, and although it can dominate a
 * single near-doji, it never outweighs either fill over a whole session.
 */
function dominantFills(candles: Measured[]): [number, number] {
  const totals = new Map<number, number>();
  for (const candle of candles) {
    for (const [shade, count] of candle.shades) {
      totals.set(shade, (totals.get(shade) ?? 0) + count);
    }
  }
  const ranked = [...totals].sort((a, b) => b[1] - a[1]).map(([shade]) => shade);
  const [first, second] = [ranked[0] ?? 0, ranked[1] ?? (ranked[0] ?? 0) + 1];
  return first <= second ? [first, second] : [second, first];
}

/** Whether a candle closed up, by which of the two fills covers more of its body. */
function isUpCandle(candle: Measured, fills: [number, number], upIsBrighter: boolean): boolean {
  const [darker, brighter] = fills;
  const brighterArea = candle.shades.get(brighter) ?? 0;
  const darkerArea = candle.shades.get(darker) ?? 0;
  return brighterArea >= darkerArea === upIsBrighter;
}

const openOf = (c: Measured, fills: [number, number], upIsBrighter: boolean) =>
  isUpCandle(c, fills, upIsBrighter) ? c.bodyBottom : c.bodyTop;
const closeOf = (c: Measured, fills: [number, number], upIsBrighter: boolean) =>
  isUpCandle(c, fills, upIsBrighter) ? c.bodyTop : c.bodyBottom;

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

  const { candles, scale, residual, rejected, upIsBrighter, fills } = measure(img, args);
  const isUp = (c: Measured) => isUpCandle(c, fills, upIsBrighter);
  const pixelPoints = 1 / scale;

  console.log(`scale ${scale.toFixed(3)} px per point`);
  console.log(
    `direction: ${upIsBrighter ? "brighter" : "darker"} of the two body fills ` +
      `(${fills.join(" / ")}) = up`,
  );
  console.log(
    `chaining residual ${residual.toFixed(2)} pts per candle ` +
      `(${(residual / pixelPoints).toFixed(1)} px); the rejected assignment scored ` +
      `${rejected.toFixed(2)}`,
  );
  // One pixel is the floor: a body edge cannot be located more finely than that,
  // so anything near it means the reading is as good as the image allows.
  if (residual > Math.max(3, pixelPoints * 2)) {
    console.log(
      `  ⚠ residual is more than two pixels' worth. Something is wrong, and the\n` +
        `    usual causes are --time naming the wrong candle, a --minutes that does\n` +
        `    not match the chart's timeframe, or chrome inside the plot box. Every\n` +
        `    price below is then wrong in a way that still looks plausible.`,
    );
  } else if (rejected < residual * 4) {
    console.log(
      `  ⚠ the two direction assignments score too similarly to choose between.\n` +
        `    Treat every open and close as unreliable; the highs and lows are fine.`,
    );
  }

  console.log(`\ntime \topen\t\thigh\t\tlow\t\tclose`);
  const rows: string[] = [];
  for (const c of candles) {
    const open = isUp(c) ? c.bodyBottom : c.bodyTop;
    const close = isUp(c) ? c.bodyTop : c.bodyBottom;
    console.log(
      `${toClock(c.minutes)}\t${open.toFixed(1)}\t${c.high.toFixed(1)}\t${c.low.toFixed(1)}\t${close.toFixed(1)}` +
        (process.env.MEASURE_DEBUG ? `\t${[...c.shades].map(([s, n]) => `${s}x${n}`).join(" ")}` : ""),
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
