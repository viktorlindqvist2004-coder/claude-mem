"use client";

import { useEffect, useRef } from "react";
import RevealText from "./RevealText";
import { prefersReducedMotion } from "@/lib/scroll";

type Star = {
  x: number;
  y: number;
  r: number;
  twinkle: number;
  phase: number;
};

type Node = {
  x: number;
  y: number;
  born: number;
};

const MAX_NODES = 22;
/** Nodes closer than this fraction of the viewport diagonal get connected. */
const LINK_RADIUS = 0.26;

/**
 * The model, drawn as a sky.
 *
 * Click or drag to place a node; nodes near each other link with luminous
 * lines. This is 2D canvas rather than WebGL on purpose — the scene is a few
 * hundred primitives with no per-pixel work, so a shader would buy nothing and
 * cost a second GL context.
 */
export default function Constellations() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let dpr = 1;

    const stars: Star[] = [];
    const nodes: Node[] = [];
    const pointer = { x: -1, y: -1, inside: false };

    const seedStars = () => {
      stars.length = 0;
      const count = Math.round((width * height) / 9000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.4 + 0.3,
          twinkle: 0.4 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars();
    };
    resize();

    const addNode = (x: number, y: number) => {
      nodes.push({ x, y, born: performance.now() });
      if (nodes.length > MAX_NODES) nodes.shift();
    };

    // Seed a starting constellation so the section is never empty.
    const seedNodes = () => {
      nodes.length = 0;
      const seeds: [number, number][] = [
        [0.22, 0.32], [0.34, 0.24], [0.44, 0.40],
        [0.58, 0.28], [0.68, 0.44], [0.78, 0.30],
      ];
      for (const [sx, sy] of seeds) {
        nodes.push({ x: sx * width, y: sy * height, born: 0 });
      }
    };
    seedNodes();

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.inside = true;
    };
    const onPointerLeave = () => {
      pointer.inside = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      addNode(event.clientX - rect.left, event.clientY - rect.top);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointerdown", onPointerDown);

    const onResize = () => {
      resize();
      seedNodes();
    };
    window.addEventListener("resize", onResize);

    // Only animate while the section is on screen.
    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(canvas);

    let frame = 0;
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;

      ctx.clearRect(0, 0, width, height);

      // Stars.
      for (const star of stars) {
        const alpha = reduced
          ? 0.6
          : 0.35 + Math.sin(time * 0.0012 * star.twinkle + star.phase) * 0.3;
        ctx.globalAlpha = Math.max(0.08, alpha);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const diagonal = Math.hypot(width, height);
      const linkDistance = diagonal * LINK_RADIUS;

      // Links between nearby nodes, brighter the closer they are.
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d > linkDistance) continue;
          ctx.strokeStyle = `rgba(232,178,41,${(1 - d / linkDistance) * 0.55})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      // A line from the pointer to whatever it is nearest.
      if (pointer.inside && nodes.length) {
        let nearest = nodes[0];
        let best = Infinity;
        for (const node of nodes) {
          const d = Math.hypot(node.x - pointer.x, node.y - pointer.y);
          if (d < best) {
            best = d;
            nearest = node;
          }
        }
        if (best < linkDistance) {
          ctx.strokeStyle = `rgba(255,255,255,${(1 - best / linkDistance) * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(nearest.x, nearest.y);
          ctx.stroke();
        }
      }

      // Nodes, each with a soft halo and a pop-in on birth.
      for (const node of nodes) {
        const age = node.born ? Math.min(1, (time - node.born) / 420) : 1;
        const eased = 1 - Math.pow(1 - age, 3);
        const r = 3.2 * eased;

        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 26 * eased);
        glow.addColorStop(0, "rgba(255,225,150,0.55)");
        glow.addColorStop(1, "rgba(255,225,150,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 26 * eased, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffe9b0";
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <section
      id="model"
      className="relative z-10 flex min-h-screen items-center overflow-hidden bg-linear-to-b from-[#050a18] via-[#0a1730] to-[#12224a] px-6 py-28 text-canvas md:px-14 md:py-40"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
      />

      {/* Figure tending a young tree, drawn in the same line language */}
      <svg
        className="pointer-events-none absolute right-6 bottom-0 hidden h-72 w-auto text-canvas/20 md:right-20 md:block md:h-[26rem]"
        viewBox="0 0 240 320"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        aria-hidden="true"
      >
        <path d="M0 300 L240 300" />
        {/* Sapling */}
        <path d="M170 300 L170 210" />
        <path d="M170 240 Q152 224 146 200" />
        <path d="M170 232 Q190 218 196 196" />
        <ellipse cx="170" cy="186" rx="34" ry="26" />
        {/* Figure with a watering vessel */}
        <path d="M74 300 Q66 252 78 214 Q88 194 100 214 Q112 252 104 300 Z" />
        <circle cx="89" cy="196" r="13" />
        <path d="M100 220 Q124 214 136 226" />
        <path d="M136 220 l16 0 l-4 16 l-16 0 z" />
        <path d="M150 236 Q158 250 160 262" strokeDasharray="3 6" />
      </svg>

      {/* Copy sits above the canvas but must not swallow clicks meant for it. */}
      <div className="pointer-events-none relative mx-auto w-full max-w-[1200px]">
        <RevealText as="p" className="eyebrow mb-6 text-canvas/60" stagger={0}>
          The model
        </RevealText>
        <RevealText
          as="h2"
          className="display max-w-4xl text-[clamp(2.5rem,6vw,5.5rem)]"
        >
          Every company we back is a point of light
        </RevealText>
        <RevealText
          as="p"
          className="mt-10 max-w-xl text-lg leading-relaxed text-canvas/75 md:mt-12 md:text-xl"
          delay={0.15}
        >
          On their own they are small. Close enough together, they hold a shape
          — introductions, hires, customers, the next round. Add one and see
          what it reaches.
        </RevealText>
        <p className="eyebrow mt-10 text-canvas/45">
          Click anywhere in the sky to place a star
        </p>
      </div>
    </section>
  );
}
