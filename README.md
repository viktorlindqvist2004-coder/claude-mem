# Sunt Förnuft — kampanjsajt

En modern, interaktiv och rörelserik ensidig webbplats för **Partiet Sunt Förnuft**
i Vänersborgs kommun (val 2026). Allt ligger i **en enda självständig fil** –
`index.html` – med CSS, JavaScript och en handritad, animerad SVG-logga inbäddad.
Inga externa beroenden, inga CDN:er, inga byggsteg.

## Visa sajten

Öppna bara filen i en webbläsare:

```bash
open index.html      # macOS
xdg-open index.html  # Linux
```

Eller publicera mappen var som helst (GitHub Pages, Netlify, en vanlig webbserver) –
det räcker att servera `index.html`.

## Designidé — ”Nordisk valalmanacka i rörelse”

- **Bildvärld:** Vänerns landskap – sjön, de flacktoppade platåbergen (Halle- &
  Hunneberg), fälten och byarna. En nick till den svenska *valaffischen*, moderniserad
  med djup och rörelse.
- **Färg:** granmörkgrön `#16362C` (varumärke/affischband) · vetegul `#E3A72E`
  (accent – solen) · sjöblå `#3C6E8F` · grönbrutet papper (ljust) / granskuggsnatt (mörkt).
- **Typografi:** varm editorial **serif** för rubriker, **systemsans** för brödtext,
  **monospace** för etiketter och siffror – som ett officiellt men mänskligt dokument.
- **Loggan:** ett eget, fullt animerat emblem – soluppgång över platåbergen och Vänern
  med roterande solstrålar, fåglar, vattenglitter och en gyllene tick-ring. Det används
  genomgående: i förladdaren, navigeringen, hjälten (med en kretsande omloppsring), i
  ”Om oss”-kortet, i sidfoten och som favicon. Skyn i emblemet skiftar dessutom mellan
  dag och natt när man byter tema.

## Interaktivitet & effekter

- Förladdare med logganimation och progressmätare
- Skrollprogress-mätare, mjuk skroll och sticky, suddig navigering med aktiv-sektion
- Reveal-animationer vid skroll (staggrade) via IntersectionObserver
- Parallax i hjälten (både mus och skroll) på flera lager
- Magnetiska knappar, 3D-tilt på kort och egen muspekare
- Räknare som räknar upp, animerade stapeldiagram
- Dag/natt-tema (sparas i `localStorage`), mobilmeny med clip-path-övergång
- FAQ-dragspel, flytande fältetiketter och ett formulär som öppnar ett färdigt mejl
- Respekterar `prefers-reduced-motion` och är fullt responsiv

## Innehåll

Texterna bygger på partiets egna budskap: *”Hela kommunen ska leva och utvecklas”*,
motstånd mot centralisering, ansvarsfull ekonomi, blocköverskridande beslut, samt
partiets ledord och kontaktvägar (suntfornuft0521@gmail.com samt Facebook).

## Byt till den riktiga loggan

Emblemet är egenritat (den riktiga loggan gick inte att hämta i den här miljön).
Vill ni använda partiets befintliga logga: lägg bildfilen bredvid `index.html` och
byt ut `<svg class="emblem" ...><use href="#emblem-src"/></svg>` (samt övriga
`<use href="#emblem-src"/>`) mot en `<img src="logga.svg" alt="Sunt Förnuft">`.
Vill ni behålla animationerna räcker det att ersätta formerna inuti `#emblem-src`.
