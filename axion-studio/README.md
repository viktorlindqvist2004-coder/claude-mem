# Axion Studio

A React + Vite + Tailwind CSS landing page for the fictional design agency
**Axion Studio**. The hero uses an animated WebGL shader background composed
from the [`shaders`](https://www.npmjs.com/package/shaders) package
(`Swirl` → `ChromaFlow` → `FlutedGlass` → `FilmGrain`), with
[`lucide-react`](https://www.npmjs.com/package/lucide-react) icons.

## Sections

1. **Hero** – full-viewport shader background, pill navbar with live London
   clock, text-roll hover CTAs, and a certified-partner badge.
2. **About** – responsive strategy statement with two showcase images.
3. **Case Studies** – autoplaying video cards (Narrativ, Luminar) with
   expanding hover buttons.

## Scripts

```bash
npm install     # install dependencies
npm run dev     # start the dev server
npm run build   # type-check and build for production
npm run preview # preview the production build
```

> The shader hero requires a WebGL-capable GPU. In headless/GPU-less
> environments the canvas still mounts but the animation will not paint.
