import { readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

/** Frame sequences live in `public/sequences/<name>/`, one image per frame. */
export const SEQUENCE_DIR = "sequences";

/**
 * Resolves the frames of a scroll-scrubbed sequence, in order.
 *
 * Server-side, at build time, for the same reason the scene stills are: an
 * absent sequence then costs nothing at runtime instead of a wave of 404s.
 *
 * Frames are sorted with a numeric collator rather than lexicographically, so
 * `frame-9` still precedes `frame-10` when an export skips zero-padding.
 *
 * Each URL carries a `?v=` stamp derived from the whole frame set. The frames
 * are served `immutable` for a year, which is right — they are large and they
 * are fetched hundreds at a time — but their names are positional, not
 * content-addressed: `0272.jpg` is whatever the 272nd frame happens to be
 * today. Recut the film and every name stays put while its content changes, so
 * a browser that visited before the recut keeps serving the old film out of
 * cache until the cache expires. The stamp changes with the set, which makes
 * every frame a new URL and retires the old ones.
 */
export function resolveSequence(name: string): string[] {
  const dir = path.join(process.cwd(), "public", SEQUENCE_DIR, name);

  let files: string[] = [];
  try {
    files = readdirSync(dir);
  } catch {
    return [];
  }

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  const frames = files
    .filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file))
    .sort(collator.compare);

  if (frames.length === 0) return [];

  // Name and size of every frame. Enough to catch a recut — the odds of a
  // rebuild leaving all 467 sizes identical are not worth reading 30 MB of
  // pixels for — and it costs a stat per frame rather than a full hash.
  const digest = createHash("sha1");
  for (const file of frames) {
    digest.update(file);
    digest.update(String(statSync(path.join(dir, file)).size));
  }
  const version = digest.digest("hex").slice(0, 8);

  return frames.map((file) => `/${SEQUENCE_DIR}/${name}/${file}?v=${version}`);
}
