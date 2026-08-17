# Dagsholm Golfklubb — webbplats

Statisk, byggfri webbplats för Dagsholm Golfklubb (18-hålsbana i
Färgelanda kommun, Dalsland).

Ingen bundler, inga npm-beroenden i drift, inga externa bilder — bara
`index.html`, en stylesheet och två ES-moduler.

```
dagsholm-golf/
├── index.html          # hela sidan, semantisk markup + JSON-LD
├── css/style.css       # designsystem, sektionsteman och layout
├── js/
│   ├── data.js         # ALLT innehåll – ändra här
│   └── app.js          # interaktion
└── vercel.json
```

## Grundprincip: inget påhittat

Sajten innehåller **bara uppgifter klubben själv kan intyga**.

Tidigare versioner av den här sidan hade en påhittad banguide,
uppskattade priser, exempelnyheter och AI-genererade bilder som inte
föreställde banan. Allt sådant är borttaget.

Där data saknas gör sidan ett aktivt val: den **göms eller hänvisar till
receptionen** i stället för att visa platshållare som kan läsas som
fakta.

| Tom lista i `data.js` | Vad som händer på sidan |
| --- | --- |
| `HOLES` | Banöversikt med enbart verifierade uppgifter. Fyll i → full hålguide + scorekort renderas automatiskt |
| `GREENFEE` | "Enligt prislista" med hänvisning till receptionen. Fyll i → pristabell renderas |
| `EXTRAS` | Rubriken utelämnas helt |
| `NEWS` | Hela nyhetssektionen göms |
| `MEMBERSHIPS[].price` | Ingen prissiffra visas, bara kategorinamnet |

Det gör att sidan kan gå live direkt utan att påstå något felaktigt, och
växer i takt med att ni fyller på.

## Kom igång lokalt

Sidan använder ES-moduler och måste serveras över HTTP — att öppna
`index.html` direkt från filsystemet fungerar inte.

```bash
cd dagsholm-golf
npm run dev          # http://localhost:4173
```

## Ändra innehåll

Allt redaktionellt bor i **`js/data.js`**:

| Export | Styr |
| --- | --- |
| `CLUB` | namn, adress, telefon, e-post |
| `STATS` | nyckeltalen under introtexten |
| `HOLES` | banguide + scorekort (tom = banöversikt i stället) |
| `COURSE` | banöversiktens fakta |
| `GREENFEE` / `GREENFEE_NOTE` | prislista och beskrivning av heldagsgreenfee |
| `EXTRAS` | övriga avgifter |
| `MEMBERSHIPS` / `MEMBERSHIP_NOTE` | medlemskategorier |
| `FACILITIES` | rutorna under "Anläggningen" |
| `RULES` | ordningsregler (skor, hund, GPS) |
| `FAQ` | frågor och svar |
| `NEWS` | nyhetsinlägg (tom = sektionen göms) |

Kontaktuppgifter finns även som riktiga `tel:`- och `mailto:`-länkar i
`index.html` och i JSON-LD-blocket i `<head>` — sök på telefonnumret om
det ska bytas.

### Att fylla i

1. **Banguiden** — `HOLES` från det officiella scorekortet. Formatet står
   dokumenterat i kommentaren ovanför exporten.
2. **Priserna** — `GREENFEE`, `EXTRAS` och avgifterna i `MEMBERSHIPS`.
3. **Nyheter** — `NEWS` när ni vill ha en aktuellt-sektion.
4. **Bilder** — se nedan.

### Bilder

Sajten har medvetet **inga bilder alls**. Den är byggd för att fungera
och se färdig ut utan dem, så att inget bildmaterial som inte föreställer
er anläggning ligger ute.

När ni har egna foton från banan lägger ni dem i en `media/`-mapp och
kompletterar layouten där ni vill ha dem — hero, banöversikt och
anläggningssektionen är de naturliga platserna. Använd riktiga foton, och
skriv `alt`-texter som beskriver vad bilden visar.

## Deploy till Vercel

Projektet ligger som ett **eget Vercel-projekt**, skilt från övriga
projekt i repot (`salon-website`, `website/suntfornuft`, `install`). Det
avgörande är **Root Directory** — då kan flera projekt bo i samma repo.

1. Vercel → **Add New… → Project** → importera repot.
2. **Root Directory:** `dagsholm-golf`  ← viktigast
3. **Framework Preset:** `Other`
4. Build Command och Install Command: lämna tomma.
5. **Project Name:** t.ex. `dagsholm-golf`.
6. Deploy.

Pushar som inte rör `dagsholm-golf/` triggar ingen ny deploy.

## Tillgänglighet och prestanda

- Fungerar helt utan JavaScript (`<noscript>`-fallback visar allt innehåll).
- Respekterar `prefers-reduced-motion` — all rörelse stängs av.
- Tangentbordsstyrning, synlig fokusmarkering, "hoppa till innehåll"-länk,
  korrekt rubrikhierarki.
- Enda externa anrop är Google Fonts, som har systemfallback i CSS.
  Inga bilder, ingen video, inga inbäddade tredjepartsramar.
