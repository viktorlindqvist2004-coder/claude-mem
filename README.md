# Vantage Studio

Webbplats för Vantage Studio — designstudio för webbplatser, grundad 2026 av
Viktor Lindqvist.

Sidans idé: besökaren möter en designstudio i halvdunkel. När man scrollar åker
kameran framåt genom rummet, in i bildskärmen — och innanför skärmen ligger
själva webbplatsen. Längst ner backar kameran ut igen och lämnar kvar
kontaktuppgifterna på skrivbordet.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver
npm run build    # produktionsbygge till dist/
npm run preview  # förhandsgranska bygget
```

Inga externa bilder används — rummet och projektbilderna är ritade i SVG och
CSS. Bygget är knappt 70 kB (gzip) och laddar bara två typsnitt från Google
Fonts.

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

**Rummet** (`src/lib/scene.ts`) byggs av plana lager på olika djup. I stället
för CSS 3D projiceras varje lager för hand: ett lager på djupet `z` skalas med
`(P − z) / (P − z − zc)` när kameran flyttat sig `zc` framåt. Alla lager skalas
kring samma punkt — mitten av bildskärmen — så skärmen ligger stilla i bild
medan rummet sveper förbi. Lager närmare kameran växer fortare och tonas ut när
de passerar den, vilket ger äkta parallax i stället för en platt inzoomning.

Eftersom både scenen och skärmen är 16:9, och scenen alltid täcker fönstret,
blir slutskalan exakt `1 / 0,14 ≈ 7,14` oavsett fönsterformat.

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
    scene.ts               kamerans matematik och lagrens djup
    track.ts               sektionernas egen position inuti skärmen
    hooks.ts               useFrame, mätning, minskad rörelse
  components/
    Stage.tsx              kamerakontext och lagerkomponenten
    Room.tsx               studion, ritad i SVG och CSS
    ScreenContent.tsx      sidan som ligger på bildskärmen
    inner/                 sektionerna inuti skärmen
  styles/                  tokens, bas, rum, skärm, gränssnitt
```
