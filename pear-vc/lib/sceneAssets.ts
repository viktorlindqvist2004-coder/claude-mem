import { readdirSync } from "node:fs";
import path from "node:path";
import { SCENE_ART_SLOTS } from "./scenes";

export type SceneArt = Record<string, string | null>;

/**
 * Resolves which scene artwork is actually present in `public/scenes/`.
 *
 * Server-side, at build time. The alternative — letting the browser request
 * every slot and fall back on failure — works, but it spends a 404 per missing
 * scene on every visit. Resolving up front means an empty `public/scenes/`
 * costs nothing and adds no console noise, which is what makes it comfortable
 * to add the artwork one file at a time.
 *
 * Extensions are matched rather than assumed, so a slot can be filled with
 * .jpg, .png, .webp or .avif without touching code. Adding a file needs a
 * rebuild to be picked up — on Vercel that is just the commit that adds it.
 */
export function resolveSceneArt(): SceneArt {
  let files: string[] = [];
  try {
    files = readdirSync(path.join(process.cwd(), "public", "scenes"));
  } catch {
    // No scenes directory at all — every slot falls back to its painting.
  }

  const art: SceneArt = {};
  for (const slot of SCENE_ART_SLOTS) {
    const match = files.find((file) => file.startsWith(`${slot}.`));
    art[slot] = match ? `/scenes/${match}` : null;
  }
  return art;
}
