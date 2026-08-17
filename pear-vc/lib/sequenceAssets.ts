import { readdirSync } from "node:fs";
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
 */
export function resolveSequence(name: string): string[] {
  let files: string[] = [];
  try {
    files = readdirSync(path.join(process.cwd(), "public", SEQUENCE_DIR, name));
  } catch {
    return [];
  }

  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  return files
    .filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file))
    .sort(collator.compare)
    .map((file) => `/${SEQUENCE_DIR}/${name}/${file}`);
}
