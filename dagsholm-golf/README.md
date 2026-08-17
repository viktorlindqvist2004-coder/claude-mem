# Dagsholm Golf — webbplats

Statisk, byggfri webbplats för Dagsholm Golf (18-hålsbana i Ellenö,
Färgelanda kommun, södra Dalsland).

Ingen bundler, inga npm-beroenden i drift — bara `index.html`, en
stylesheet och tre ES-moduler. Det gör den snabb att ladda, trivial att
hosta och lätt att underhålla för den som inte är utvecklare.

```
dagsholm-golf/
├── index.html          # hela sidan, semantisk markup + JSON-LD
├── css/style.css       # designsystem och layout
├── js/
│   ├── data.js         # ALLT redaktionellt innehåll – ändra här
│   ├── media.js        # bild-/videomanifest
│   └── app.js          # interaktion
├── media/              # lokala mediefiler (se "Media" nedan)
├── scripts/
│   └── vendor-media.sh # hämtar hem media från CDN
└── vercel.json
```

## Kom igång lokalt

Sidan använder ES-moduler, så den måste serveras över HTTP —
att öppna `index.html` direkt från filsystemet fungerar inte.

```bash
cd dagsholm-golf
npm run dev          # http://localhost:4173
```

Eller vad som helst annat: `python3 -m http.server 4173`, `php -S`, …

## Ändra innehåll

Nästan allt redaktionellt bor i **`js/data.js`**:

| Export | Styr |
| --- | --- |
| `CLUB` | namn, adress, telefon, e-post, koordinater |
| `STATS` | nyckeltalen under introtexten |
| `HOLES` | banguiden och scorekortet, hål 1–18 |
| `GREENFEE` | prislistan, låg- och högsäsong |
| `EXTRAS` | golfbil, vagn, hyrklubbor, ställplats … |
| `MEMBERSHIPS` | medlemskapsnivåerna |
| `FACILITIES` | rutorna under "Anläggningen" |
| `SEASONS` | årstidsrutorna |
| `NEWS` | nyhetsposterna |
| `FAQ` | frågor och svar |

Kontaktuppgifter förekommer även som riktiga `tel:`- och `mailto:`-länkar
i `index.html` och i JSON-LD-blocket i `<head>` — sök på telefonnumret om
det ska bytas.

### ⚠ Innan sajten går live

Två saker är ifyllda med rimliga utgångsvärden och bör stämmas av mot
klubbens officiella uppgifter:

1. **Banguiden (`HOLES`)** — hålnamn, längder och index är påhittade för
   att visa upp funktionen. Ersätt med siffrorna från det officiella
   scorekortet.
2. **Priserna (`GREENFEE`, `EXTRAS`, `MEMBERSHIPS`)** — bygger på
   offentligt tillgängliga uppgifter och kan vara inaktuella. Stäm av
   mot årets prislista.

Verifierat mot publika källor: 18 hål, par 72, skogs- och parkbana,
ritad av Åke Persson, invigd 1991 (tidigare Färgelanda Golfklubb),
adress Dagsholm 12, 458 92 Färgelanda, heldagsgreenfee-modellen,
telefon och e-post.

## Media

Bild- och filmmaterialet är AI-genererat med Higgsfield (Veo 3.1 Lite för
video, Soul Location för stillbilder) och ligger som standard kvar på
Higgsfields CDN. Det fungerar direkt, men **ersätt gärna med riktiga
foton från banan när sådana finns** — då byter du bara sökvägarna i
`js/media.js`.

För att i stället servera allt från din egen domän:

```bash
bash scripts/vendor-media.sh      # laddar ner till media/
# sätt sedan USE_LOCAL = true högst upp i js/media.js
```

Det rekommenderas inför skarp drift: du slipper beroendet av en extern
CDN, och filerna cachas då med `immutable` enligt `vercel.json`.

## Deploy till Vercel

Projektet är avsett att ligga som ett **eget Vercel-projekt**, skilt från
övriga projekt i det här repot (`salon-website`, `website/suntfornuft`,
`install`). Det avgörande är att sätta **Root Directory** — då kan flera
projekt bo i samma repo utan att krocka.

1. Vercel → **Add New… → Project** → importera det här GitHub-repot.
2. **Root Directory:** `dagsholm-golf`  ← viktigast
3. **Framework Preset:** `Other`
4. Build Command och Install Command: lämna tomma (`vercel.json` sätter
   redan `null` — det finns inget att bygga).
5. **Project Name:** t.ex. `dagsholm-golf` (måste vara unikt i kontot).
6. Deploy.

Vercel bygger då bara den här mappen, och pushar som inte rör
`dagsholm-golf/` triggar ingen ny deploy.

Med Vercel CLI i stället:

```bash
cd dagsholm-golf
vercel --name dagsholm-golf        # första gången: länka som nytt projekt
vercel --prod
```

## Tillgänglighet och prestanda

- Fungerar helt utan JavaScript (`<noscript>`-fallback visar allt innehåll).
- Respekterar `prefers-reduced-motion` — all rörelse stängs av.
- Tangentbordsstyrning: piltangenter i banguiden och i bildvisaren,
  `Esc` stänger meny och bildvisare, fokusfälla i bildvisaren.
- Synlig fokusmarkering, "hoppa till innehåll"-länk, korrekt
  rubrikhierarki, `alt`-texter på allt bildmaterial.
- Bilder laddas lazy, showreel-videon först när sektionen närmar sig.
- Inga typsnitt eller skript blockerar rendering utöver Google Fonts,
  som har systemfallback i CSS.
