"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/scroll";

/**
 * A scroll-scrubbed frame sequence.
 *
 * Scroll position selects a frame; the frame is drawn to a canvas. Nothing is
 * playing — the reader is moving the shot themselves, which is what lets the
 * subject itself act (a hand opening a pear) rather than the camera merely
 * drifting over a still.
 *
 * Two things make this harder than "load the images and draw one":
 *
 * 1. **Memory.** A 60-frame full-screen sequence held as decoded bitmaps is
 *    hundreds of megabytes — enough to have the tab killed on a phone. So only
 *    a window around the current frame is kept decoded; the rest stay as bytes
 *    in the HTTP cache and are decoded on approach.
 * 2. **Latency.** Decoding cannot keep up with a fast flick. Rather than stall
 *    or flicker, the canvas always draws the nearest frame it already holds,
 *    so the shot degrades in temporal resolution instead of breaking.
 */

/** Decoded frames kept resident. Roughly `WINDOW` × frame size in memory. */
const WINDOW = 14;
/** How far ahead of the current frame to decode, in frames. */
const LOOKAHEAD = 6;
/** Concurrent decodes. Enough to stay ahead, few enough to not starve paint. */
const MAX_IN_FLIGHT = 4;
/**
 * How hard the playhead chases the scroll, per second.
 *
 * Lower is smoother and laggier. At 6 the film settles about a fifth of a
 * second behind a stopped finger, which reads as weight rather than delay.
 */
const DAMPING = 6;
/**
 * How far cover-fit may magnify a frame past contain-fit.
 *
 * 1.3 keeps a 16:9 frame nearly whole on a tall phone while still filling a
 * landscape window edge to edge.
 */
const MAX_OVERSCAN = 1.3;
/** Painted where a capped frame does not reach the canvas edge. */
const MATTE = "#14161a";

type Frames = {
  get(index: number): ImageBitmap | undefined;
  nearest(index: number): { bitmap: ImageBitmap; index: number } | null;
  request(index: number): void;
  dispose(): void;
};

function createFrameStore(urls: string[]): Frames {
  const bitmaps = new Map<number, ImageBitmap>();
  const pending = new Set<number>();
  let current = 0;
  let inFlight = 0;
  let disposed = false;

  const queue: number[] = [];

  const pump = () => {
    while (!disposed && inFlight < MAX_IN_FLIGHT && queue.length > 0) {
      // Nearest-to-current first: a flick changes what matters mid-flight.
      queue.sort((a, b) => Math.abs(a - current) - Math.abs(b - current));
      const index = queue.shift();
      if (index === undefined) return;
      if (bitmaps.has(index)) {
        pending.delete(index);
        continue;
      }

      inFlight++;
      fetch(urls[index])
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.blob();
        })
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          if (disposed) {
            bitmap.close();
            return;
          }
          bitmaps.set(index, bitmap);
          evict();
        })
        .catch(() => {
          /* A missing frame just leaves a gap; nearest() covers it. */
        })
        .finally(() => {
          inFlight--;
          pending.delete(index);
          pump();
        });
    }
  };

  /** Drop whatever is furthest from where the reader actually is. */
  const evict = () => {
    if (bitmaps.size <= WINDOW) return;
    const held = [...bitmaps.keys()].sort(
      (a, b) => Math.abs(b - current) - Math.abs(a - current)
    );
    for (const index of held) {
      if (bitmaps.size <= WINDOW) break;
      bitmaps.get(index)?.close();
      bitmaps.delete(index);
    }
  };

  return {
    get: (index) => bitmaps.get(index),

    nearest(index) {
      const exact = bitmaps.get(index);
      if (exact) return { bitmap: exact, index };
      // Search outward so the drawn frame is never far from the intended one.
      for (let offset = 1; offset < urls.length; offset++) {
        const before = bitmaps.get(index - offset);
        if (before) return { bitmap: before, index: index - offset };
        const after = bitmaps.get(index + offset);
        if (after) return { bitmap: after, index: index + offset };
      }
      return null;
    },

    request(index) {
      current = index;
      for (let offset = 0; offset <= LOOKAHEAD; offset++) {
        const target = index + offset;
        if (target >= urls.length) break;
        if (bitmaps.has(target) || pending.has(target)) continue;
        pending.add(target);
        queue.push(target);
      }
      pump();
    },

    dispose() {
      disposed = true;
      queue.length = 0;
      for (const bitmap of bitmaps.values()) bitmap.close();
      bitmaps.clear();
      pending.clear();
    },
  };
}

export default function SequenceScrubber({
  frames,
  className = "",
  triggerId,
}: {
  /** Frame URLs in order. Renders nothing when empty. */
  frames: string[];
  className?: string;
  /** Element whose scroll span drives the sequence. */
  triggerId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx || typeof createImageBitmap !== "function") return;

    gsap.registerPlugin(ScrollTrigger);

    const store = createFrameStore(frames);
    const last = frames.length - 1;
    const reduced = prefersReducedMotion();

    /** Where the scroll says we are, in frames — fractional. */
    let target = 0;
    /** Where the playhead actually is, chasing `target`. */
    let position = 0;
    let requested = -1;
    /** What is currently on the canvas: base frame plus blend amount. */
    let drawnSignature = "";
    let dirty = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      dirty = true;
    };
    resize();
    window.addEventListener("resize", resize);

    /**
     * Fit the frame to the canvas, cropping — but only so far.
     *
     * Plain cover-fit is right on a landscape screen, where the frame's 16:9
     * and the viewport's aspect nearly agree. On a phone held upright it is
     * ruinous: covering a 9:19.5 viewport with a 16:9 frame magnifies it well
     * past double, and the reader sees a narrow column out of the middle of
     * every shot. Whole compositions — the figure and the cloth, the pear and
     * the scaffold — end up off-screen.
     *
     * So cover is capped at MAX_OVERSCAN times contain. Where the two agree
     * nothing changes; where they diverge the frame stays nearer its true
     * framing and the leftover is painted, which the section's scrim absorbs.
     */
    const draw = (bitmap: ImageBitmap, alpha = 1) => {
      const cover = Math.max(
        canvas.width / bitmap.width,
        canvas.height / bitmap.height
      );
      const contain = Math.min(
        canvas.width / bitmap.width,
        canvas.height / bitmap.height
      );
      const scale = Math.min(cover, contain * MAX_OVERSCAN);

      const w = bitmap.width * scale;
      const h = bitmap.height * scale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      ctx.globalAlpha = 1;
    };

    const trigger = reduced
      ? null
      : ScrollTrigger.create({
          trigger: `#${triggerId}`,
          start: "top top",
          end: "bottom bottom",
          // Keep the scroll's own position as a fraction of a frame. Rounding
          // here instead would hand the damping a staircase to follow.
          onUpdate: (self) => {
            target = self.progress * last;
          },
        });

    // Reduced motion still gets the opening frame, just never a moving one.
    store.request(0);

    const render = (_time: number, deltaTime: number) => {
      resize();

      if (reduced) {
        position = target = 0;
      } else {
        // Exponential smoothing, framed in seconds so the feel does not change
        // with refresh rate. The playhead chases the scroll rather than being
        // pinned to it, which is what turns a flick into a glide instead of a
        // jump — the film keeps moving for a moment after the finger stops.
        const dt = Math.min(deltaTime, 100) / 1000;
        position += (target - position) * (1 - Math.exp(-DAMPING * dt));
        if (Math.abs(target - position) < 0.01) position = target;
      }

      const base = Math.floor(position);
      const frac = position - base;

      if (base !== requested) {
        store.request(base);
        requested = base;
      }

      const under = store.nearest(base);
      if (!under) return;

      // The film is cut at 7fps but scrolled at whatever rate the reader
      // chooses, so at a slow scroll each frame would hold for tens of pixels
      // and the motion would read as a series of steps. Cross-dissolving into
      // the next frame by the playhead's fractional part fills those gaps: the
      // picture changes every rendered frame instead of every seventh of a
      // second of footage. Cheaper than shipping more frames, and it smooths
      // the slow scrolling that shipping more frames would not.
      // Only blend when the frame under the playhead is the real one. If
      // `nearest` had to substitute a distant frame, dissolving it into
      // base + 1 would mix two unrelated moments.
      const over =
        under.index === base && frac > 0.02 ? store.get(base + 1) : undefined;

      const signature = `${under.index}:${over ? Math.round(frac * 60) : "-"}`;
      if (!dirty && signature === drawnSignature) return;

      // Clear first: a capped frame may not reach every edge, and without this
      // the uncovered strip would keep whatever the previous frame left there.
      ctx.fillStyle = MATTE;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      draw(under.bitmap);
      if (over) draw(over, frac);

      drawnSignature = signature;
      dirty = false;
    };

    gsap.ticker.add(render);

    return () => {
      gsap.ticker.remove(render);
      trigger?.kill();
      window.removeEventListener("resize", resize);
      store.dispose();
    };
  }, [frames, triggerId]);

  if (frames.length === 0) return null;

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
