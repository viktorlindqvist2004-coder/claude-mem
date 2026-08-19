#!/usr/bin/env node
/**
 * Turns the rendered shots into the scroll-scrubbed frame sequence.
 *
 *   node scripts/build-film.mjs shot1.mp4 shot2.mp4 shot3.mp4 shot4.mp4
 *
 * Shots are given in story order and numbered continuously across the whole
 * film, so the scrubber sees one sequence rather than four. That is the point:
 * the joins between shots should be invisible, and they cannot be if the page
 * knows where they are.
 *
 * Frames are cut at FPS rather than every frame. The sequence is driven by
 * scroll, not by a clock, so what matters is having enough frames that a
 * comfortable scroll never skips visibly — not matching the source's 24fps.
 * Every extra frame is bytes the reader pays for.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, readdirSync, renameSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SEQUENCES = path.join(ROOT, "public", "sequences");

/** Frames cut per second of footage. */
const FPS = 7;
/** JPEG quality. These are soft painterly frames; they take compression well. */
const QUALITY = 4; // ffmpeg -q:v scale, 2 (best) – 31 (worst)

/**
 * Two sizes of the same film.
 *
 * A phone draws the film into a canvas around 780px wide, but a browser decodes
 * whatever it is given — so serving 1280px frames there means decoding roughly
 * 2.7x the pixels needed, twice per drawn frame because adjacent frames are
 * blended. That is the whole cost of the scrub on a phone, and it shows up as
 * lag. The small set exists to remove it; the scrubber picks by canvas size.
 */
const SIZES = [
  { dir: "film", width: 1280 },
  { dir: "film-sm", width: 720 },
];

function ffmpegPath() {
  const candidates = [
    process.env.FFMPEG_PATH,
    path.join(ROOT, "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(ROOT, "..", "node_modules", "ffmpeg-static", "ffmpeg"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return "ffmpeg"; // fall back to whatever is on PATH
}

/**
 * A shot may be suffixed `:head,tail` to drop that many cut frames from its
 * start and end.
 *
 * Generated footage often needs this. A model given a flat image as a keyframe
 * can decide the image is a painting and animate the wall around it — the shot
 * is right in the middle and wrong at the edges. Trimming is the honest fix;
 * regenerating costs credits and usually reintroduces the same idea.
 */
function parseShot(arg) {
  const match = /^(.*?):(\d+),(\d+)$/.exec(arg);
  if (!match) return { file: arg, head: 0, tail: 0 };
  return { file: match[1], head: Number(match[2]), tail: Number(match[3]) };
}

const shots = process.argv.slice(2).map(parseShot);
if (shots.length === 0) {
  console.error("usage: build-film.mjs <shot1.mp4[:head,tail]> [shot2.mp4 ...]");
  process.exit(1);
}
for (const { file } of shots) {
  if (!existsSync(file)) {
    console.error(`missing: ${file}`);
    process.exit(1);
  }
}

const ffmpeg = ffmpegPath();

for (const { dir, width } of SIZES) {
  const out = path.join(SEQUENCES, dir);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  let frameNumber = 0;

  shots.forEach(({ file, head, tail }, index) => {
    // Extract into a scratch dir first: ffmpeg's %d counter restarts per input,
    // and the sequence needs one continuous run of numbers across all shots.
    const scratch = path.join(out, `.shot-${index}`);
    mkdirSync(scratch, { recursive: true });

    execFileSync(
      ffmpeg,
      [
        "-i", file,
        "-vf", `fps=${FPS},scale=${width}:-2`,
        "-q:v", String(QUALITY),
        "-loglevel", "error",
        path.join(scratch, "%04d.jpg"),
      ],
      { stdio: "inherit" }
    );

    const all = readdirSync(scratch).sort();
    const kept = all.slice(head, all.length - tail);

    for (const name of kept) {
      frameNumber++;
      const target = String(frameNumber).padStart(4, "0") + ".jpg";
      renameSync(path.join(scratch, name), path.join(out, target));
    }
    rmSync(scratch, { recursive: true, force: true });

    if (width === SIZES[0].width) {
      const trimmed = head || tail ? ` (trimmed ${head}/${tail})` : "";
      console.log(`shot ${index + 1}: ${kept.length} frames${trimmed}`);
    }
  });

  console.log(`${frameNumber} frames at ${width}px → public/sequences/${dir}/`);
}
