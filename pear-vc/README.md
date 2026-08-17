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

There are no image files. Every scene is painted with Canvas 2D into an
offscreen square and uploaded as a GL texture — nothing to download, nothing to
license, and it resamples cleanly on a 5K display. Texture size scales with the
device (1024–1792px). Scenes 0 and 1 are painted synchronously for the first
frame and its transition; the rest go out on `requestIdleCallback`, and each
backing canvas is released as soon as the GPU has the pixels.

Figures are drawn from behind or cropped above the shoulders. Canvas primitives
cannot carry a face at close range, and classical processional figures are
staged that way anyway.

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
