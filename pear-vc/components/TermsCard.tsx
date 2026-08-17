"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/scroll";

type Metric = {
  label: string;
  value: number;
  prefix?: string;
  suffix: string;
  note: string;
};

const METRICS: Metric[] = [
  { label: "Management fee", value: 0, suffix: "%", note: "for the life of the fund" },
  { label: "Carried interest", value: 20, suffix: "%", note: "only above return of capital" },
  { label: "First cheque", value: 750, prefix: "$", suffix: "K", note: "typical, $250K–$2M" },
  { label: "Target ownership", value: 10, suffix: "%", note: "8–12% at seed" },
];

/**
 * The terms panel: an architectural drawing that doubles as a data card.
 *
 * The card tilts toward the pointer using a damped rAF loop rather than a CSS
 * transition, so the motion tracks continuously instead of easing to each new
 * pointer position in discrete steps.
 */
export default function TermsCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState(() => METRICS.map(() => 0));

  // Pointer tilt.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion()) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    const loop = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      card.style.transform = `perspective(1200px) rotateY(${current.x * 6}deg) rotateX(${-current.y * 6}deg)`;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Count the metrics up once the card is in view.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    if (prefersReducedMotion()) {
      setCounts(METRICS.map((m) => m.value));
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const proxy = METRICS.map(() => ({ v: 0 }));
      gsap.to(proxy, {
        v: 1,
        duration: 1.6,
        ease: "power2.out",
        stagger: 0.08,
        onUpdate: () =>
          setCounts(METRICS.map((m, i) => Math.round(proxy[i].v * m.value))),
        scrollTrigger: { trigger: card, start: "top 85%", once: true },
      });
    }, cardRef);

    return () => context.revert();
  }, []);

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden rounded-2xl border border-canvas/25 bg-ink/25 p-5 backdrop-blur-md will-change-transform sm:p-7 md:p-9"
    >
      {/* Architectural drawing behind the numbers */}
      <svg
        className="pointer-events-none absolute -top-6 -right-10 h-56 w-56 text-canvas/25 md:h-72 md:w-72"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
        aria-hidden="true"
      >
        {/* Wireframe dome */}
        <path d="M20 130 A80 80 0 0 1 180 130" />
        <path d="M100 50 L100 130" />
        {[0.25, 0.5, 0.75].map((t) => (
          <ellipse
            key={t}
            cx="100"
            cy="130"
            rx={80 * Math.cos((Math.PI / 2) * t)}
            ry="80"
          />
        ))}
        {[0.3, 0.6, 0.85].map((t) => (
          <ellipse
            key={`p-${t}`}
            cx="100"
            cy={130 - Math.sin((Math.PI / 2) * t) * 80}
            rx={Math.cos((Math.PI / 2) * t) * 80}
            ry={Math.cos((Math.PI / 2) * t) * 18}
          />
        ))}
        <path d="M10 130 L190 130" />
        {/* Floorplan */}
        <g className="text-gold" stroke="currentColor">
          <rect x="26" y="146" width="64" height="40" />
          <rect x="32" y="152" width="24" height="28" />
          <path d="M62 186 L62 152 L84 152" />
        </g>
      </svg>

      <p className="eyebrow relative mb-8 text-canvas/70">Model 01 · Standard terms</p>

      <dl className="relative space-y-4 md:space-y-6">
        {METRICS.map((metric, i) => (
          <div
            key={metric.label}
            className="flex items-baseline justify-between gap-4 border-b border-canvas/15 pb-4 last:border-0 md:gap-6 md:pb-5"
          >
            <div>
              <dt className="text-base text-canvas md:text-lg">{metric.label}</dt>
              <p className="eyebrow mt-1.5 text-canvas/55">{metric.note}</p>
            </div>
            <dd className="display shrink-0 text-3xl text-gold tabular-nums md:text-5xl">
              {metric.prefix ?? ""}
              {counts[i]}
              {metric.suffix}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
