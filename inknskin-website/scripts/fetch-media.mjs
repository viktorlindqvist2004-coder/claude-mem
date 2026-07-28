#!/usr/bin/env node
/**
 * Laddar ner allt media som lib/media.ts pekar på till public/media/,
 * så att sidan kan serveras helt från din egen domän.
 *
 *   node scripts/fetch-media.mjs
 *
 * Sätt sedan NEXT_PUBLIC_MEDIA_SOURCE=local (i .env.local och i Vercel) så
 * används de lokala filerna i stället för CDN:et.
 */

import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "media");

// Läs manifestet utan att behöva TypeScript-kompilering.
const manifest = await import("node:fs/promises").then(({ readFile }) =>
  readFile(join(root, "lib", "media.ts"), "utf8"),
);

const REMOTE_BASE = manifest.match(/"(https:\/\/[^"]+\/)"/)?.[1];
if (!REMOTE_BASE) {
  console.error("Hittade ingen REMOTE_BASE i lib/media.ts");
  process.exit(1);
}

// Plocka ut alla (fjärrfil, lokalt filnamn)-par ur asset()/video()-anropen.
const pairs = [
  ...manifest.matchAll(/"(hf_[^"]+\.(?:png|jpg|mp4))",\s*\n\s*"([^"]+)"/g),
].map(([, remote, local]) => ({ remote, local }));

if (pairs.length === 0) {
  console.error("Hittade inga mediafiler i lib/media.ts");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

let ok = 0;
let failed = 0;

for (const { remote, local } of pairs) {
  const dest = join(outDir, local);
  try {
    await stat(dest);
    console.log(`•  finns redan  ${local}`);
    ok++;
    continue;
  } catch {
    // filen saknas — ladda ner
  }

  const url = REMOTE_BASE + remote;
  process.stdout.write(`↓  ${local} … `);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    console.log(`${(buf.length / 1024 / 1024).toFixed(1)} MB`);
    ok++;
  } catch (err) {
    console.log(`MISSLYCKADES (${err.message})`);
    failed++;
  }
}

console.log(`\nKlart: ${ok} filer, ${failed} misslyckade.`);
if (failed === 0) {
  console.log("Sätt NEXT_PUBLIC_MEDIA_SOURCE=local för att använda dem.");
}
process.exit(failed > 0 ? 1 : 0);
