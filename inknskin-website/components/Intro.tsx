"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { videos } from "@/lib/media";
import Counter from "@/components/ui/Counter";

const COPY =
  "Vi tatuerar inte motiv. Vi bygger något som ska sitta på dig resten av livet — ritat från grunden, anpassat efter din kropp och utfört med tålamod tills varje linje ligger rätt.";

/** Each word fades from ghost to bone as the block scrolls through the viewport. */
function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, [8, 0]);
  return (
    <span className="relative mr-[0.26em] inline-block">
      <motion.span style={{ opacity, y }} className="inline-block">
        {children}
      </motion.span>
    </span>
  );
}

export default function Intro() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "start 0.15"],
  });

  const words = COPY.split(" ");

  const inkRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: inkProgress } = useScroll({
    target: inkRef,
    offset: ["start end", "end start"],
  });
  const inkY = useTransform(inkProgress, [0, 1], ["-12%", "12%"]);
  const inkScale = useTransform(inkProgress, [0, 0.5, 1], [1.15, 1, 1.15]);

  return (
    <section ref={ref} id="studion" className="edge relative py-[clamp(6rem,14vh,11rem)]">
      <div className="flex items-baseline gap-4">
        <span className="eyebrow">01 — Studion</span>
        <span className="hairline flex-1" />
      </div>

      <p className="display mt-12 max-w-[22ch] text-[clamp(1.75rem,4.6vw,4.2rem)] leading-[1.02] tracking-[-0.035em] text-bone md:max-w-[26ch]">
        {words.map((w, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          return (
            <Word key={`${w}-${i}`} progress={scrollYProgress} range={[start, end]}>
              {w}
            </Word>
          );
        })}
      </p>

      <div className="mt-20 grid gap-12 md:grid-cols-[1.05fr_0.95fr] md:items-end">
        {/* Ink footage, parallaxing inside its frame */}
        <div
          ref={inkRef}
          className="relative aspect-[16/10] overflow-hidden rounded-sm bg-ink-2"
        >
          <motion.video
            className="h-[124%] w-full -translate-y-[10%] object-cover opacity-90"
            style={{ y: inkY, scale: inkScale }}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster={videos.ink.poster}
            aria-hidden
          >
            <source src={videos.ink.src} type="video/mp4" />
          </motion.video>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/30" />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10">
          <Stat value={<Counter to={2} />} label="Tatuerare i studion" />
          <Stat value={<Counter to={16} suffix="B" />} label="Kungsgatan, Trollhättan" />
          <Stat value={<Counter to={5} suffix=" min" />} label="Från Trollhättan C" />
          <Stat value={<Counter to={100} suffix="%" />} label="Steril engångsutrustning" />

          <p className="col-span-2 mt-2 max-w-md text-[0.95rem] leading-relaxed text-bone-dim">
            Studion ligger på Kungsgatan 16B, ungefär fem minuters promenad från
            Trollhättan Central. Bemannad måndag till fredag 12:00–16:30 — tider
            utanför det bokas via DM eller direkt på plats.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="border-t border-bone/12 pt-4">
      <div className="display text-[clamp(2.2rem,5vw,3.6rem)] leading-none text-bone tabular-nums">
        {value}
      </div>
      <div className="mt-2 text-[0.72rem] uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
    </div>
  );
}
