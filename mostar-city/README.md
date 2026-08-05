# Mostar city

En fristående cinematisk scroll-sida. Ren vanilla — ingen ramverk, inget byggsteg,
inga lokala assets. All bild och typografi laddas från externa URL:er.

```
mostar-city/
├── index.html      # hela DOM-trädet
├── styles.css      # CSS-variabler + all layout
├── script.js       # scroll-motorn och slidern
└── vercel.json     # statisk deploy, inget build-kommando
```

## Kör lokalt

Öppna `index.html` direkt i webbläsaren, eller servera mappen:

```bash
python3 -m http.server 8000 --directory mostar-city
# http://localhost:8000
```

## Deploya till Vercel

Projektet är helt isolerat från resten av repot. Det finns **inget** `package.json`
här, så Vercel kör varken install eller build — mappen serveras som statiska filer.

**Viktigt:** sätt Root Directory till `mostar-city`, annars bygger Vercel repo-roten
(`claude-mem`) och drar in de andra projekten i samma repo.

### Via dashboarden

1. **Add New… → Project** och importera repot `claude-mem`.
2. **Root Directory** → `mostar-city`.
3. Lämna **Include source files outside of the Root Directory** *avstängt*.
   Det är den inställningen som håller deployen borta från dina andra projekt.
4. **Framework Preset** → `Other`. Build Command och Install Command lämnas tomma.
5. **Deploy.**

### Via CLI

```bash
cd mostar-city
vercel        # preview
vercel --prod # produktion
```

CLI:t använder mappen du står i som Root Directory, så resten av repot rörs inte.

## Externa beroenden

Sidan laddar allt innehåll från tredjepartsvärdar vid körning:

| Vad | Värd |
|---|---|
| Ogg Medium (display-typsnitt) | `dcym8fthxf5uu.cloudfront.net` |
| Scenlager (7 PNG) | `raft-blast-61784561.figma.site` |
| Pin-ikoner (3 PNG) | `d8j0ntlcm91z4.cloudfront.net` |

Om någon av värdarna slutar svara faller sidan tillbaka på systemets serif och
tomma bildytor — layouten och scroll-koreografin påverkas inte. Vill du garantera
att sidan lever vidare oberoende av dem behöver assetsen laddas ner och checkas in.
