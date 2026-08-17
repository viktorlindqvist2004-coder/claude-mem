# pear.

A scroll-driven, story-based landing page for a fictional seed-stage VC —
Renaissance staging rendered through a modern technical grid.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · GSAP (ScrollTrigger +
SplitText) · Lenis.

## Deploying to Vercel

This app lives in a subdirectory of a larger repo, so Vercel needs to be told
where it is:

1. **Add New → Project**, import this repository.
2. Set **Root Directory** to `pear-vc`. This is the only setting that matters —
   everything else is picked up from `vercel.json` and `package.json`.
3. Deploy. Framework preset (Next.js), build command and install command are
   detected automatically; there are no environment variables to set.

For the CLI: `cd pear-vc && vercel` — being inside the directory makes it the
root, so no extra flags.

## How the story works

The page has two halves. The first is a fixed, full-viewport WebGL canvas with
five painted scenes; the second is ordinary opaque DOM that scrolls over it.

```
components/StoryCanvas.tsx   fixed WebGL canvas — scene zoom + portal masks
lib/shaders.ts               the story shader (mask, parallax, grain, rim)
lib/scenes.ts                procedural artwork, painted to offscreen canvases
components/Story.tsx         the five scroll beats layered over the canvas
components/SmoothScroll.tsx  Lenis wired into the GSAP ticker
```

**Scroll → scene.** `StoryCanvas` measures where each `#story > section`
actually begins and maps scroll position onto a continuous scene coordinate in
`[0, 4]`. The integer part picks the scene pair; the fraction drives that
scene's zoom and, past `PORTAL_START` (58%), the expanding mask that reveals
the next scene through it. Measuring real offsets rather than splitting the
container evenly is what lets a section grow taller than the viewport — which
it does on phones, where the terms copy needs the room — without the portals
drifting away from the copy.

**The portal.** A single fragment shader samples two scene textures, each with
its own zoom and pointer parallax, and mixes them across a signed-distance
mask: a pear silhouette (two smooth-unioned circles), a circle, or an
architectural aperture, alternating per transition. A gold rim rides the mask
edge and a radial chromatic split peaks mid-transition.

**Smooth scroll.** Lenis and GSAP both want to own a rAF loop; running both
de-synchronises scroll position from the animations reading it. GSAP's ticker
owns the frame, drives `lenis.raf`, and Lenis pushes its position into
ScrollTrigger.

## Artwork

Scenes are photographic artwork — hyperrealistic religious painting — served
from `public/scenes/`. **See [ARTWORK.md](./ARTWORK.md)** for the filenames,
prompts and format each scene expects.

Every scene also has a drawn fallback: a Canvas 2D painter in `lib/scenes.ts`
that renders the same composition from primitives. The fallback is not a
placeholder to be deleted — it does real work:

- it paints in ~30ms, so a scene is never blank while a multi-megabyte
  photograph is still downloading;
- a missing or failed image leaves the drawing in place rather than a black
  screen, which is also what makes it safe to add scene files one at a time.

`paintScene` therefore paints first and swaps the photograph in on load. The
shader reads each texture's real aspect ratio, so source images do not have to
be square — square just crops best across orientations.

Texture size for the drawn version scales with the device (1024–1792px). Scenes
0 and 1 resolve synchronously for the first frame and its transition; the rest
go out on `requestIdleCallback`, and each backing canvas is released as soon as
the GPU has the pixels.

Drawn figures are seen from behind or cropped above the shoulders — canvas
primitives cannot carry a face at close range. Photographs have no such limit.

## Interaction and fallbacks

- **FAQ** rows animate `grid-template-rows` `0fr → 1fr`, so the browser
  interpolates to the answer's real height at the current width.
- **Constellations** is a separate 2D canvas — a few hundred primitives with no
  per-pixel work, so a second GL context would buy nothing. Click to add nodes;
  nearby ones link.
- **No WebGL** → the canvas hides and the CSS gradient behind it carries the
  page; the scrims keep the type readable.
- **`prefers-reduced-motion`** → Lenis is skipped for native scrolling, text
  reveals resolve instantly, and pointer parallax is disabled. Scroll-linked
  zoom stays, since it only moves when the reader does.
- Rendering pauses when the tab is hidden or the story has scrolled away.

The apply form has no backend — it validates and acknowledges locally.
