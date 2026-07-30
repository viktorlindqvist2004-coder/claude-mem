#!/usr/bin/env bun
/**
 * Turn a video into frames an assistant can actually read.
 *
 * The constraint this works around: an assistant reviewing this project can see
 * images but cannot watch video and cannot hear audio. A clip of someone
 * explaining a setup is therefore unreadable as a video — but perfectly
 * readable as a sequence of stills, provided the chart is on screen.
 *
 * What this gets you:  everything visible — the chart, drawn levels, the fib,
 *                      burned-in captions, on-screen text.
 * What it does NOT:    anything only spoken. Audio needs a transcript, which
 *                      this script cannot produce. Paste the platform's
 *                      auto-captions instead.
 *
 *   bun run scripts/video-frames.ts clip.mp4 [--every 2] [--out frames]
 *
 * ffmpeg is resolved from `ffmpeg-static` if installed, otherwise from PATH:
 *
 *   npm install ffmpeg-static --no-save
 */

import { mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Find ffmpeg wherever it happens to be.
 *
 * The awkward case this handles: `import("ffmpeg-static")` resolves relative to
 * *this file*, so installing the package in the directory you happen to be
 * standing in does not help. Checking the working directory too makes the
 * obvious `npm install` in the obvious place work.
 */
async function resolveFfmpeg(explicit?: string): Promise<string> {
  const candidates: string[] = [];

  if (explicit) candidates.push(explicit);
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);

  try {
    const mod = (await import("ffmpeg-static")) as { default?: string };
    if (mod.default) candidates.push(mod.default);
  } catch {
    // Not installed next to this script; other candidates may still work.
  }

  candidates.push(join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"));

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }

  const which = Bun.spawnSync(["which", "ffmpeg"]);
  const found = new TextDecoder().decode(which.stdout).trim();
  if (found) return found;

  throw new Error(
    "ffmpeg not found. Install it with:  npm install ffmpeg-static --no-save\n" +
      "or pass --ffmpeg <path>, or set FFMPEG_PATH.",
  );
}

async function run(ffmpeg: string, args: string[]): Promise<void> {
  const proc = Bun.spawnSync([ffmpeg, ...args], { stderr: "pipe", stdout: "pipe" });
  if (proc.exitCode !== 0) {
    throw new Error(new TextDecoder().decode(proc.stderr).split("\n").slice(-6).join("\n"));
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const video = args.find((arg) => !arg.startsWith("--"));
  if (!video) {
    console.error("Usage: bun run scripts/video-frames.ts <video> [--every 2] [--out frames]");
    process.exit(1);
  }
  if (!existsSync(video)) {
    console.error(`No such file: ${video}`);
    process.exit(1);
  }

  const every = Number(valueOf(args, "--every") ?? 2);
  const outDir = resolve(valueOf(args, "--out") ?? "frames");
  const ffmpeg = await resolveFfmpeg(valueOf(args, "--ffmpeg"));

  await mkdir(outDir, { recursive: true });

  // Scale to a width that keeps chart text legible without producing files so
  // large they are slow to read. 1280 is comfortably enough for candle wicks.
  await run(ffmpeg, [
    "-y",
    "-i", video,
    "-vf", `fps=1/${every},scale=1280:-2`,
    "-q:v", "3",
    join(outDir, "frame-%03d.jpg"),
  ]);

  const frames = (await readdir(outDir)).filter((name) => name.startsWith("frame-")).sort();

  // A contact sheet makes it cheap to spot which frames are worth reading in
  // full, rather than opening thirty stills one at a time.
  if (frames.length > 1) {
    const columns = Math.min(4, frames.length);
    await run(ffmpeg, [
      "-y",
      "-i", join(outDir, "frame-%03d.jpg"),
      "-vf", `scale=480:-2,tile=${columns}x${Math.ceil(frames.length / columns)}`,
      "-q:v", "4",
      join(outDir, "contact-sheet.jpg"),
    ]);
  }

  console.log(`${frames.length} frames every ${every}s → ${outDir}`);
  for (const frame of frames) console.log(`  ${join(outDir, frame)}`);
  if (frames.length > 1) console.log(`  ${join(outDir, "contact-sheet.jpg")}  ← scan this first`);
  console.log(
    `\nSpoken audio is NOT captured. Paste the clip's captions or transcript separately.`,
  );
}

function valueOf(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
