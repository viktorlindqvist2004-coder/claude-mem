/**
 * BAKGRUNDSFOTOT
 * ══════════════
 * Sidan öppnar med ett riktigt fotografi av ett skrivbord, lätt oskarpt.
 * När man scrollar åker kameran in i bildskärmen på fotot, och därinne ligger
 * webbplatsen.
 *
 * För att illusionen ska sitta måste `screen` peka ut exakt var skärmytan
 * ligger i bilden. Värdena är andelar av bildens bredd respektive höjd
 * (0–1), räknat från bildens övre vänstra hörn.
 *
 * ── Byta foto ──────────────────────────────────────────────────────────
 * 1. Lägg bilden i `public/images/` och peka ut den i `src` nedan.
 * 2. Sätt `aspect` till bildens proportioner (bredd / höjd).
 * 3. Starta `npm run dev` och öppna sidan med `?calibrate` i adressfältet.
 *    Då läggs en ram över skärmytan som du flyttar med piltangenterna
 *    (håll skift för att ändra storlek). Siffrorna visas på skärmen —
 *    klistra in dem här och ta bort `?calibrate`.
 *
 * Välj helst ett foto där skärmen är vänd rakt mot kameran. Ju mer den är
 * vriden, desto tydligare syns det att den rektangulära webbsidan inte
 * ligger i samma vinkel som skärmen i bilden.
 */
export const PHOTO = {
  /** Sökväg under `public/`. */
  src: 'images/studio.jpg',

  /** Bildens proportioner (bredd delat med höjd). */
  aspect: 16 / 9,

  /** Skärmytans plats i bilden, som andel av bildens bredd och höjd. */
  screen: { x: 0.43, y: 0.355, w: 0.14, h: 0.14 },

  /** Oskärpa på fotot i vila respektive när kameran är som närmast (px). */
  blur: 6,
  blurNear: 18,

  /** Hur mycket fotot mörkas ned så att texten ovanpå går att läsa (0–1). */
  dim: 0.42,
} as const

export type PhotoScreen = { x: number; y: number; w: number; h: number }
