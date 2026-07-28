#!/usr/bin/env node
/**
 * Hämtar riktiga Google-omdömen för studion och skriver dem till
 * lib/reviews.generated.json.
 *
 *   export GOOGLE_MAPS_API_KEY=...
 *   node scripts/fetch-google-reviews.mjs
 *
 * Kräver att Places API (New) är aktiverat i Google Cloud-projektet.
 * Google returnerar max 5 omdömen per plats via API:et — resten får läggas in
 * för hand i lib/reviews.ts, eller så länkar man vidare till Google-profilen.
 *
 * OBS: Googles villkor kräver att omdömen visas med recensentens namn och att
 * de inte redigeras. Kopiera texterna som de är.
 */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY) {
  console.error("Saknar GOOGLE_MAPS_API_KEY.");
  process.exit(1);
}

const QUERY = process.env.PLACES_QUERY ?? "Ink N Skin tatuering studio Kungsgatan 16B Trollhättan";

const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": KEY,
    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
  },
  body: JSON.stringify({ textQuery: QUERY, languageCode: "sv" }),
});

if (!searchRes.ok) {
  console.error("Sökning misslyckades:", searchRes.status, await searchRes.text());
  process.exit(1);
}

const { places = [] } = await searchRes.json();
if (places.length === 0) {
  console.error(`Hittade ingen plats för: ${QUERY}`);
  process.exit(1);
}

const place = places[0];
console.log(`Plats: ${place.displayName?.text} — ${place.formattedAddress}`);

const detailsRes = await fetch(
  `https://places.googleapis.com/v1/places/${place.id}?languageCode=sv`,
  {
    headers: {
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews",
    },
  },
);

if (!detailsRes.ok) {
  console.error("Detaljer misslyckades:", detailsRes.status, await detailsRes.text());
  process.exit(1);
}

const details = await detailsRes.json();

const output = {
  placeId: place.id,
  fetchedAt: new Date().toISOString(),
  rating: details.rating ?? null,
  userRatingCount: details.userRatingCount ?? 0,
  reviews: (details.reviews ?? []).map((r) => ({
    author: r.authorAttribution?.displayName ?? "Google-användare",
    rating: r.rating,
    body: r.originalText?.text ?? r.text?.text ?? "",
    source: "Google",
    publishTime: r.publishTime,
  })),
};

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "lib",
  "reviews.generated.json",
);
await writeFile(out, JSON.stringify(output, null, 2) + "\n");

console.log(
  `Skrev ${output.reviews.length} omdömen (betyg ${output.rating}, ${output.userRatingCount} totalt) till lib/reviews.generated.json`,
);
console.log("Importera dem i lib/reviews.ts och sätt REVIEWS_VERIFIED = true.");
