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
const OUT = path.join(ROOT, "public", "sequences", "film");

/** Frames cut per second of footage. */
const FPS = 7;
/** Long edge of an exported frame. Sources are 1344px, so this never upscales. */
const WIDTH = 1280;
/** JPEG quality. These are soft painterly frames; they take compression well. */
const QUALITY = 4; // ffmpeg -q:v scale, 2 (best) – 31 (worst)

function ffmpegPath() {
  const candidates = [
    path.join(ROOT, "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(ROOT, "..", "node_modules", "ffmpeg-static", "ffmpeg"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return "ffmpeg"; // fall back to whatever is on PATH
}

const shots = process.argv.slice(2);
if (shots.length === 0) {
  console.error("usage: build-film.mjs <shot1.mp4> [shot2.mp4 ...]");
  process.exit(1);
}
for (const shot of shots) {
  if (!existsSync(shot)) {
    console.error(`missing: ${shot}`);
    process.exit(1);
  }
}

const ffmpeg = ffmpegPath();
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let frameNumber = 0;

shots.forEach((shot, index) => {
  // Extract into a scratch dir first: ffmpeg's %d counter restarts per input,
  // and the sequence needs one continuous run of numbers across all shots.
  const scratch = path.join(OUT, `.shot-${index}`);
  mkdirSync(scratch, { recursive: true });

  execFileSync(
    ffmpeg,
    [
      "-i", shot,
      "-vf", `fps=${FPS},scale=${WIDTH}:-2`,
      "-q:v", String(QUALITY),
      "-loglevel", "error",
      path.join(scratch, "%04d.jpg"),
    ],
    { stdio: "inherit" }
  );

  const cut = readdirSync(scratch).sort();
  for (const file of cut) {
    frameNumber++;
    const name = String(frameNumber).padStart(4, "0") + ".jpg";
    renameSync(path.join(scratch, file), path.join(OUT, name));
  }
  rmSync(scratch, { recursive: true, force: true });

  console.log(`shot ${index + 1}: ${cut.length} frames`);
});

console.log(`\n${frameNumber} frames → public/sequences/film/`);
