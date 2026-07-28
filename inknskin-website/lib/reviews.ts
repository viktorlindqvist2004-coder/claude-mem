/* =============================================================================
 *  ⚠️  PLACEHOLDER-OMDÖMEN — MÅSTE BYTAS UT INNAN LANSERING  ⚠️
 * =============================================================================
 *
 *  Texterna nedan är EXEMPEL. De är skrivna för att visa hur sektionen ser ut
 *  och beter sig — de är INTE riktiga kundomdömen om Ink N Skin.
 *
 *  Att publicera påhittade omdömen som äkta är vilseledande marknadsföring och
 *  strider mot både marknadsföringslagen och Googles villkor. Byt ut dem.
 *
 *  SÅ HÄR HÄMTAR DU DE RIKTIGA:
 *    1. Skaffa en Google Places API-nyckel  →  https://console.cloud.google.com
 *    2. export GOOGLE_MAPS_API_KEY=...
 *    3. node scripts/fetch-google-reviews.mjs
 *       (skriptet skriver lib/reviews.generated.json)
 *    4. Importera den filen här nedan och sätt `verified: true`.
 *
 *  Så länge `verified` är false renderas INGEN aggregateRating i strukturerad
 *  data — sidan påstår alltså aldrig utåt att betyget är verifierat.
 * ---------------------------------------------------------------------------*/

export type Review = {
  /** Visningsnamn. Vid riktiga Google-omdömen: använd namnet som recensenten själv publicerat. */
  author: string;
  /** 1–5 */
  rating: number;
  /** Själva omdömestexten. */
  body: string;
  /** Valfri kontext, t.ex. vilken typ av jobb det gällde. */
  context?: string;
  /** Valfri källa, t.ex. "Google" eller "Instagram". */
  source?: string;
};

/**
 * Sätt till true först när innehållet nedan ersatts med verifierade omdömen.
 * Styr strukturerad data (aggregateRating) och utvecklingsvarningen.
 */
export const REVIEWS_VERIFIED = false;

export const reviews: Review[] = [
  {
    author: "Exempelkund 1",
    rating: 5,
    body: "Superproffsigt bemötande från första DM:et till sista sittningen. De tog sig tid att rita om skissen tills den satt precis rätt, och resultatet blev bättre än vad jag hade i huvudet.",
    context: "Blackwork, underarm",
    source: "Google",
  },
  {
    author: "Exempelkund 2",
    rating: 5,
    body: "Otroligt ren och trevlig studio mitt i stan. Kände mig lugn hela vägen, och de förklarade exakt vad de gjorde under tiden. Linjerna är knivskarpa.",
    context: "Fineline, nyckelben",
    source: "Google",
  },
  {
    author: "Exempelkund 3",
    rating: 5,
    body: "Hade en gammal ful tatuering som jag trodde var omöjlig att göra något åt. De var ärliga om vad som gick att göra och löste det snyggt — nu är det mitt favoritmotiv.",
    context: "Cover-up, överarm",
    source: "Google",
  },
  {
    author: "Exempelkund 4",
    rating: 5,
    body: "Första tatueringen och jag var rätt nervös. De var lugna, tog pauser när jag behövde och pushade aldrig på något jag inte ville. Kommer garanterat tillbaka.",
    context: "Första tatueringen",
    source: "Google",
  },
  {
    author: "Exempelkund 5",
    rating: 5,
    body: "Bra pris för kvaliteten och tydlig kommunikation kring vad det skulle kosta redan innan bokning. Inga överraskningar, bara ett riktigt bra jobb.",
    context: "Lettering, revben",
    source: "Google",
  },
  {
    author: "Exempelkund 6",
    rating: 5,
    body: "Har suttit flera gånger nu för att bygga ihop en hel arm. Varje sittning känns genomtänkt och de håller alltid tiden. Rekommenderar till alla i Trollhättan.",
    context: "Pågående sleeve",
    source: "Google",
  },
];

export const reviewCount = reviews.length;

export const averageRating =
  Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
