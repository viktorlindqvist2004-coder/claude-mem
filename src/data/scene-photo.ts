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

  /** Bildens proportioner (bredd delat med höjd). 1280 × 714. */
  aspect: 1.7927,

  /**
   * Skärmytans plats i bilden. Uppmätt automatiskt: originalbilden hade en
   * magenta skärm, vars pixlar gav rutan x474–806, y310–494 av 1280 × 714.
   * Magentan är övermålad i den sparade bilden så att den inte blöder rosa
   * när fotot suddas.
   */
  screen: { x: 0.3703, y: 0.4342, w: 0.2602, h: 0.2591 },

  /** Oskärpa på fotot i vila respektive när kameran är som närmast (px). */
  blur: 5,
  blurNear: 16,

  /** Hur mycket fotot mörkas ned så att texten ovanpå går att läsa (0–1). */
  dim: 0.3,
} as const

export type PhotoScreen = { x: number; y: number; w: number; h: number }
