# Vantage Design Studio

Webbplats för Vantage Design Studio — designstudio för webbplatser, grundad 2026 av
Viktor Lindqvist.

Sidans idé: besökaren möter ett fotografi av ett skrivbord, lätt oskarpt. När
man scrollar åker kameran framåt in i bildskärmen på fotot — och innanför
skärmen ligger själva webbplatsen. Längst ner backar kameran ut igen och lämnar
kvar kontaktuppgifterna på skrivbordet.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm run build    # produktionsbygge till dist/
npm run preview  # förhandsgranska bygget
```

## Bilderna

Sidan vill ha följande filer i `public/images/`. Saknas en fil ritas en neutral
reserv i stället, så sidan aldrig visar en trasig bildruta:

| Fil | Används till |
| --- | --- |
| `studio.jpg` | Skrivbordet som sidan öppnar med. **Viktigast.** ✅ |
| `showcase-01.jpg` | Helskärmsbild efter manifestet — skrivbordet uppifrån ✅ |
| `showcase-02.jpg` | Helskärmsbild efter processen — identitetsarbete ✅ |
| `work-01.jpg` … `work-06.jpg` | Projektkorten i arbetsgalleriet (4:3) — saknas än |

**`studio.jpg` behöver vara ett foto där bildskärmen är vänd rakt mot
kameran.** Ju mer skärmen är vriden, desto tydligare syns det att den
rektangulära webbsidan inte ligger i samma vinkel som skärmen i bilden. Ett
foto med naturligt kort skärpedjup är extra bra — då behövs mindre oskärpa i
CSS.

### Passa in skärmytan

När `studio.jpg` är på plats behöver koden veta exakt var skärmen ligger i
bilden. Starta `npm run dev` och lägg till `?calibrate` i adressfältet:

```
http://localhost:5173/?calibrate
```

En ram läggs över skärmytan. Piltangenter flyttar, skift ändrar storlek, alt
finjusterar. Siffrorna visas i panelen nere till vänster — klistra in dem i
`screen` i `src/data/scene-photo.ts` och ta bort `?calibrate`. Där ställer du
även bildens proportioner (`aspect`) och hur oskarp den ska vara.

## Så fungerar kameran

Hela dramaturgin styrs av **ett enda värde**: `window.scrollY`. Sidan har ingen
egen scrollbar — `.viewport` ligger stilla och en tom, hög `.scroll-spacer` ger
sidan sin höjd.

Scrollen delas i tre akter (`src/App.tsx`):

| Akt | Sträcka | Vad som händer |
| --- | --- | --- |
| 1 | 4,6 fönsterhöjder | Kameran åker in i skärmen |
| 2 | innehållets höjd | Sidan inuti skärmen rullar |
| 3 | 3 fönsterhöjder | Kameran backar ut, kontakten träder fram |

**Skrivbordet** (`src/lib/scene.ts`) är ett enda plan — fotografiet. Kameran
åker rakt fram mot skärmen i bilden, vilket motsvarar att skala fotot kring
skärmens mittpunkt med `(P − z) / (P − z − zc)` när kameran flyttat sig `zc`
framåt. Formeln i stället för en rak `scale(1 → 7)` gör att rörelsen
accelererar som en riktig framåtåkning: långsamt på håll, snabbt de sista
metrarna. Fotot täcker alltid fönstret, så slutskalan blir densamma oavsett
fönsterformat.

Samtidigt tonas en kraftigare oskarp kopia av fotot in — skärpedjupet minskar
när kameran närmar sig, som en riktig kamera som ställer om fokus från rummet
till skärmen. Att korstona två färdiga bilder är mycket billigare än att
animera `filter: blur()`.

**Skärmens innehåll** (`src/components/ScreenContent.tsx`) ritas i fönstrets
fulla storlek och skalas ned med `1 / kameraskalan`. När kameran nått hela vägen
in tar de två skalorna ut varandra och sidan ligger i exakt 1:1 — texten är då
lika skarp som på vilken vanlig sida som helst, inte uppförstorad.

## Prestanda

Inget renderas om i React per bildruta. Komponenter prenumererar på
bildruteloopen med `useFrame` (`src/lib/hooks.ts`) och skriver direkt till
`element.style` — React ritar bara om vid faktiska tillståndsbyten, som när vi
kliver in i skärmen. Bara `transform` och `opacity` animeras.

Eftersom innehållet inuti skärmen rullas med `transform` fungerar varken
`position: sticky` eller `IntersectionObserver` därinne. Sektionerna räknar i
stället ut sin egen position via `useTrack` (`src/lib/track.ts`).

## Minskad rörelse

Med `prefers-reduced-motion: reduce` sätts akt 1 och 3 till noll. Sidan startar
då direkt inne i skärmen och beter sig som en helt vanlig webbplats — ingen
kamerarörelse, ingen parallax, och kontakten ligger som en vanlig sektion sist.

## Innan sidan går live

Följande är platshållare och behöver bytas ut (allt ligger i
`src/data/content.ts`):

- **Arbetena** är sex *konceptarbeten* som visar formspråket, inte riktiga
  uppdrag. De är märkta "Urval — konceptarbeten" i gränssnittet. Byt ut dem mot
  riktiga case när de finns.
- **E-post** (`hej@vantagestudio.se`) och **telefonnummer** är påhittade.
- **Plats** står som "Sverige" — smalna av till ort om du vill.
- Lägg till en riktig OG-bild och `og:url` i `index.html` inför delning.

## Filer

```
src/
  App.tsx                  akterna, sidans höjd, kamerans förflyttning
  lib/
    scroll.ts              bildruteloop, utjämnad scroll, härledda värden
    scene.ts               kamerans matematik
    track.ts               sektionernas egen position inuti skärmen
    hooks.ts               useFrame, mätning, minskad rörelse
  data/
    scene-photo.ts         bakgrundsfotot och skärmytans inpassning
    content.ts             all text, projekt och tjänster
  components/
    Stage.tsx              kamerakontext och kamerans förlopp
    Scene.tsx              skrivbordsfotot och skärmytan
    ScreenContent.tsx      sidan som ligger på bildskärmen
    inner/                 sektionerna inuti skärmen
  styles/                  tokens, bas, scen, skärm, gränssnitt
```
