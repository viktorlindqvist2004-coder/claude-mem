"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  createProgram,
  createQuad,
  createSolidTexture,
  loadImage,
  resizeToDisplay,
  uploadCanvasTexture,
} from "@/lib/gl";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "@/lib/shaders";
import { prefersReducedMotion } from "@/lib/scroll";
import {
  SCENE_TRANSITIONS,
  SCENE_BASE_COLORS,
  SCENE_COUNT,
  SCENE_PAINTERS,
} from "@/lib/scenes";

const UNIFORM_NAMES = [
  "uTexA",
  "uTexB",
  "uResolution",
  "uMouse",
  "uTime",
  "uFade",
  "uZoomA",
  "uZoomB",
  "uAspectA",
  "uAspectB",
  "uFocusA",
  "uFocusB",
  "uBloom",
] as const;

type UniformName = (typeof UNIFORM_NAMES)[number];

/** Portal transitions occupy the tail of each scene's scroll unit. */
const PORTAL_START = 0.58;

/** How far the camera pushes into a focal form before the scenes swap. */
const ZOOM_THROUGH = 6.0;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Fixed, full-viewport WebGL canvas that renders the story.
 *
 * Scroll position over `#story` is mapped to a continuous scene coordinate in
 * [0, SCENE_COUNT-1]. The integer part selects the scene pair, the fractional
 * part drives that scene's zoom and — past PORTAL_START — the expanding mask
 * that reveals the next scene through it.
 */
export default function StoryCanvas({
  storyId = "story",
  sceneImages = [],
}: {
  storyId?: string;
  /** Resolved artwork URL per scene, or null where only the painting exists. */
  sceneImages?: (string | null)[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    }) ||
      canvas.getContext("experimental-webgl", {
        alpha: false,
      })) as WebGLRenderingContext | null;

    // No WebGL: the CSS gradient backdrop behind the canvas carries the page.
    if (!gl) {
      canvas.style.display = "none";
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    const quad = createQuad(gl);
    if (!program || !quad) {
      canvas.style.display = "none";
      return;
    }

    gl.useProgram(program);

    const uniforms = {} as Record<UniformName, WebGLUniformLocation | null>;
    for (const name of UNIFORM_NAMES) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(uniforms.uTexA, 0);
    gl.uniform1i(uniforms.uTexB, 1);

    /* -- Textures: placeholders first, real artwork painted progressively -- */

    const textures = SCENE_BASE_COLORS.map((rgb) => createSolidTexture(gl, rgb));
    const painted = new Array<boolean>(SCENE_COUNT).fill(false);
    // Painted fallbacks are square; a photograph overwrites this on arrival.
    const aspects = new Array<number>(SCENE_COUNT).fill(1);
    let disposed = false;

    // Square artwork; sized to the device rather than a fixed constant so
    // phones don't pay for a 1792px texture they can't resolve.
    const textureSize =
      window.innerWidth < 768 ? 1024 : window.innerWidth < 1440 ? 1536 : 1792;

    const paintScene = (index: number) => {
      const texture = textures[index];
      if (!texture || painted[index]) return;
      painted[index] = true;

      const offscreen = document.createElement("canvas");
      offscreen.width = textureSize;
      offscreen.height = textureSize;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;

      SCENE_PAINTERS[index](ctx, textureSize);
      uploadCanvasTexture(gl, texture, offscreen);

      // Drop the backing store immediately — five 1792² canvases retained is
      // ~50MB of memory for pixels the GPU already owns.
      offscreen.width = 0;
      offscreen.height = 0;

      // Upgrade to the photographic artwork when it arrives. Painting first
      // means the scene is never blank while a multi-megabyte image is still
      // downloading, and a missing file simply leaves the painting in place.
      const src = sceneImages[index];
      if (!src) return;
      loadImage(src)
        .then((image) => {
          if (disposed) return;
          aspects[index] = image.naturalWidth / image.naturalHeight || 1;
          uploadCanvasTexture(gl, texture, image);
        })
        .catch(() => {
          /* No photograph for this scene; the painted version stands. */
        });
    };

    // The first two scenes are needed for the opening frame and its transition.
    paintScene(0);
    paintScene(1);

    const idle: (cb: () => void) => number =
      typeof window.requestIdleCallback === "function"
        ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
        : (cb) => window.setTimeout(cb, 60);

    let queued = 2;
    const paintNext = () => {
      if (queued >= SCENE_COUNT) return;
      paintScene(queued++);
      idle(paintNext);
    };
    idle(paintNext);

    /* -- Scroll and pointer state ---------------------------------------- */

    const state = {
      target: 0, // scene coordinate the scroll wants
      current: 0, // damped value actually rendered
      mouseX: 0,
      mouseY: 0,
      easedX: 0,
      easedY: 0,
      visible: true,
      onScreen: true,
    };

    // Scene position is derived from where each story section actually starts,
    // not from a single progress ratio over the whole container. Sections are
    // only as tall as their content needs (taller than a viewport on small
    // screens), so an even split would drift the portals away from the copy
    // exactly where the copy is longest.
    let sectionTops: number[] = [];

    const measure = () => {
      const sections = document.querySelectorAll<HTMLElement>(
        `#${storyId} > section`
      );
      sectionTops = Array.from(sections, (section) =>
        Math.round(section.getBoundingClientRect().top + window.scrollY)
      );
    };
    measure();
    ScrollTrigger.addEventListener("refresh", measure);

    /** Maps scroll position to a continuous scene coordinate. */
    const sceneCoordinate = (scrollY: number): number => {
      const last = Math.min(SCENE_COUNT, sectionTops.length) - 1;
      if (last < 1) return 0;
      for (let i = last - 1; i >= 0; i--) {
        if (scrollY >= sectionTops[i]) {
          const span = sectionTops[i + 1] - sectionTops[i];
          if (span <= 0) return i;
          return i + Math.min(1, (scrollY - sectionTops[i]) / span);
        }
      }
      return 0;
    };

    // The sections after the story are opaque and scroll over the canvas, so
    // it never needs fading out — it only needs to stop drawing once it is
    // covered.
    const visibility = ScrollTrigger.create({
      trigger: `#${storyId}`,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        state.onScreen = self.isActive;
      },
    });

    // Scroll-linked zoom is kept under reduced-motion (it only moves when the
    // reader moves), but pointer parallax drifts on its own, so it is not.
    const parallax = !prefersReducedMotion();

    const onPointerMove = (event: PointerEvent) => {
      state.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      state.mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    if (parallax) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    const onVisibility = () => {
      state.visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);

    /* -- Render loop ------------------------------------------------------ */

    const start = performance.now();

    const render = (_time: number, deltaTime: number) => {
      if (!state.visible || !state.onScreen) return;

      // Damping on top of Lenis smooths the handoff between scene pairs and
      // keeps flick-scrolls from stepping through portals instantly.
      //
      // Exponential rather than a fixed per-frame fraction: a constant factor
      // would settle at half the speed on a 30fps device and twice the speed
      // on a 120Hz one, so the portal would visibly trail the scroll on slower
      // hardware. Rates are chosen to match the old 0.12/0.06 at 60fps.
      const dt = Math.min(deltaTime, 100) / 1000;
      const scrollEase = 1 - Math.exp(-7.67 * dt);
      const mouseEase = 1 - Math.exp(-3.71 * dt);

      state.target = sceneCoordinate(window.scrollY);
      state.current += (state.target - state.current) * scrollEase;
      state.easedX += (state.mouseX - state.easedX) * mouseEase;
      state.easedY += (state.mouseY - state.easedY) * mouseEase;

      resizeToDisplay(gl, canvas);

      const u = state.current;
      const index = Math.min(SCENE_COUNT - 2, Math.max(0, Math.floor(u)));
      const f = clamp01(u - index);
      const portal = clamp01((f - PORTAL_START) / (1 - PORTAL_START));

      // The travel. Zoom is exponential in the transition because a dolly
      // covers equal *ratios* of distance per unit time, not equal amounts —
      // linear zoom reads as a scale animation, exponential reads as movement.
      //
      // Both curves pass through exactly ZOOM_THROUGH^0.5 at portal 0.5, so at
      // the instant of the fade the two scenes are at identical magnification.
      // That is what makes the join invisible: matched scale, matched focal
      // form, nothing recognisable left in frame.
      const travel = Math.pow(ZOOM_THROUGH, portal);
      const zoomA = (1 + f * 0.14) * travel;
      const zoomB = ZOOM_THROUGH / travel;

      // Swap inside the peak, quickly, while both frames are abstract.
      const fade = smoothstep(0.40, 0.60, portal);
      // Warm flare either side of the swap, strongest where it is needed.
      const bloom = Math.sin(portal * Math.PI);

      const transition = SCENE_TRANSITIONS[index] ?? SCENE_TRANSITIONS[0];

      const texA = textures[index];
      const texB = textures[Math.min(SCENE_COUNT - 1, index + 1)];

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texB);

      gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.uMouse, state.easedX, -state.easedY);
      gl.uniform1f(uniforms.uTime, (performance.now() - start) / 1000);
      gl.uniform1f(uniforms.uFade, fade);
      gl.uniform1f(uniforms.uBloom, bloom);
      gl.uniform1f(uniforms.uZoomA, zoomA);
      gl.uniform1f(uniforms.uZoomB, zoomB);
      gl.uniform1f(uniforms.uAspectA, aspects[index]);
      gl.uniform1f(uniforms.uAspectB, aspects[Math.min(SCENE_COUNT - 1, index + 1)]);
      gl.uniform2f(uniforms.uFocusA, transition.exit[0], transition.exit[1]);
      gl.uniform2f(uniforms.uFocusB, transition.enter[0], transition.enter[1]);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    gsap.ticker.add(render);

    return () => {
      disposed = true;
      gsap.ticker.remove(render);
      ScrollTrigger.removeEventListener("refresh", measure);
      visibility.kill();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const texture of textures) if (texture) gl.deleteTexture(texture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [storyId, sceneImages]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      {/* Painted before WebGL is ready and whenever it is unavailable. */}
      <div className="absolute inset-0 bg-linear-to-b from-sky-deep via-sky to-sky-light" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
