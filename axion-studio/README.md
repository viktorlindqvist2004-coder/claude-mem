# Stolts Fastigheter

En landningssida byggd med React + Vite + Tailwind CSS för **Stolts
Fastigheter** – ett lokalt fastighetsföretag som hyr ut trygga och trivsamma
bostäder i Brålanda, Sverige. Sidan riktar sig särskilt till äldre som
värdesätter lugn, närhet till service och naturen runt Dalboslätten.

Hero-sektionen använder en animerad WebGL-bakgrund från paketet
[`shaders`](https://www.npmjs.com/package/shaders)
(`Swirl` → `ChromaFlow` → `FlutedGlass` → `FilmGrain`) med ikoner från
[`lucide-react`](https://www.npmjs.com/package/lucide-react).

## Sektioner

1. **Hero** – shader-bakgrund, pill-navigering med levande Brålanda-klocka
   och inbjudande rubrik om trygga hem nära naturen.
2. **Välkommen hem** – presentation av hyresvärden med bilder från Brålanda
   kyrka och Dalboslätten.
3. **Lediga hem** – bostadskort (Storgatan, Sörbyn) med foton från orten.

## Bilder

Bilderna är autentiska foton från Brålanda och Dalboslätten via
[Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Br%C3%A5landa)
(se `src/images.ts`). De fungerar som platshållare – byt gärna ut dem mot
egna foton av era faktiska bostäder. Varje bild har en mjuk gradient-fallback
om källan inte kan laddas.

## Skript

```bash
npm install     # installera beroenden
npm run dev     # starta utvecklingsservern
npm run build   # typkontroll och produktionsbygge
npm run preview # förhandsgranska bygget
```

> Shader-bakgrunden kräver en WebGL-kapabel GPU. I miljöer utan GPU monteras
> canvasen men animeringen ritas inte ut.
