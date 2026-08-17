# Dagsholm Golfklubb — webbplats

Statisk, byggfri webbplats för Dagsholm Golfklubb (18-hålsbana i
Färgelanda kommun, Dalsland).

Ingen bundler och inga npm-beroenden i drift — bara `index.html`, en
stylesheet och tre ES-moduler.

```
dagsholm-golf/
├── index.html          # hela sidan, semantisk markup + JSON-LD
├── css/style.css       # designsystem, sektionsteman och layout
├── js/
│   ├── data.js         # ALLT innehåll – ändra här
│   ├── media.js        # filmklippen
│   └── app.js          # interaktion
└── vercel.json
```

## Grundprincip: inget påhittat

Sajten innehåller **bara uppgifter klubben själv kan intyga**.

Tidigare versioner av den här sidan hade en påhittad banguide,
uppskattade priser, exempelnyheter och AI-genererade stillbilder som inte
föreställde banan. Allt sådant är borttaget. Filmklippen som finns kvar
används enbart som bakgrund och är märkta som stämningsbilder — se
"Film och bilder" nedan.

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

### Film och bilder

Sajten har **inga stillbilder**. Den är byggd för att se färdig ut utan
dem.

Den har däremot **film**: sex AI-genererade solnedgångsklipp från en
golfbana i allmänhet, som roterar i hero och ligger i två filmband. De
**föreställer inte Dagsholm**. Därför används de enbart som bakgrund,
aldrig med bildtext som påstår att det är klubbens egen bana, och
filmbandet är märkt "Stämningsbild".

Byt ut dem så fort ni har egen film — det är bara URL:erna i
`js/media.js` som behöver ändras. Ta då även bort märkningen
`.reel__note` i `index.html`.

Filmen laddas först när den behövs, pausas när den rullar ur bild, och
ett klipp som inte går att spela plockas automatiskt ur rotationen. Går
inget klipp att spela visas hero:ns gradient i stället och paus-knappen
tas bort.

Egna foton lägger ni i en `media/`-mapp och kompletterar layouten med —
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
- Externa anrop: Google Fonts (systemfallback i CSS) och filmklippen.
  Inga stillbilder, inga inbäddade tredjepartsramar.
