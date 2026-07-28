"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { process } from "@/lib/site";
import { MaskUp } from "@/components/ui/SplitText";

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.75", "end 0.85"],
  });
  const lineScale = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });
  const counterIndex = useTransform(scrollYProgress, [0, 1], [1, process.length]);

  return (
    <section id="process" className="edge relative py-[clamp(5rem,12vh,9rem)]">
      <div className="flex items-baseline gap-4">
        <span className="eyebrow">06 — Från idé till hud</span>
        <span className="hairline flex-1" />
      </div>

      <div ref={ref} className="mt-12 grid gap-14 md:grid-cols-[0.85fr_1.15fr] md:gap-20">
        {/* Sticky column */}
        <div className="md:sticky md:top-32 md:h-fit md:self-start">
          <MaskUp>
            <h2 className="display t-lg text-bone">Så går det till</h2>
          </MaskUp>
          <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-bone-dim">
            Ingen ska sitta i stolen och undra vad som händer härnäst. Fyra steg,
            samma varje gång — från första meddelandet till läkt tatuering.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <motion.span className="display text-[3.5rem] leading-none text-ember tabular-nums">
              <StepNumber value={counterIndex} />
            </motion.span>
            <span className="text-[0.7rem] uppercase tracking-[0.18em] text-muted">
              av {process.length} steg
            </span>
          </div>
        </div>

        {/* Steps with a rail that fills as you scroll */}
        <ol className="relative pl-8 md:pl-12">
          <span className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px bg-bone/12" aria-hidden />
          <motion.span
            className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px origin-top bg-ember"
            style={{ scaleY: lineScale }}
            aria-hidden
          />

          {process.map((step, i) => (
            <motion.li
              key={step.n}
              className="group relative pb-14 last:pb-0"
              initial={{ opacity: 0, x: 26 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.span
                className="absolute -left-8 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-ember md:-left-12"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 16 }}
                aria-hidden
              />
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-[0.7rem] tracking-[0.2em] text-muted">
                  {step.n}
                </span>
                <h3 className="display text-[clamp(1.4rem,2.8vw,2.2rem)] text-bone">
                  {step.title}
                </h3>
              </div>
              <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-bone-dim">
                {step.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Renders a MotionValue as a rounded, padded step number. */
function StepNumber({ value }: { value: import("motion/react").MotionValue<number> }) {
  const rounded = useTransform(value, (v) =>
    String(Math.min(process.length, Math.max(1, Math.round(v)))).padStart(2, "0"),
  );
  return <motion.span>{rounded}</motion.span>;
}
