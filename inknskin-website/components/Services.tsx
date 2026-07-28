"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { useRef, useState } from "react";
import { services } from "@/lib/site";
import { images } from "@/lib/media";
import { MaskUp } from "@/components/ui/SplitText";

// One frame per service, in list order.
const PREVIEWS = [
  images.tools,
  images.fineline,
  images.arm,
  images.flash,
  images.needle,
  images.studio,
];

export default function Services() {
  const [hovered, setHovered] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 22, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 150, damping: 22, mass: 0.5 });

  const onMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };

  return (
    <section id="tjanster" className="edge relative py-[clamp(5rem,12vh,9rem)]">
      <div className="flex items-baseline gap-4">
        <span className="eyebrow">02 — Vad vi gör</span>
        <span className="hairline flex-1" />
      </div>

      <MaskUp className="mt-10">
        <h2 className="display t-xl text-bone">Arbetet</h2>
      </MaskUp>

      <div
        ref={containerRef}
        className="relative mt-14"
        onPointerMove={onMove}
        onPointerLeave={() => setHovered(null)}
      >
        {/* Floating preview that rides the cursor across the list */}
        <AnimatePresence>
          {hovered !== null && (
            <motion.div
              key={hovered}
              className="pointer-events-none absolute z-20 hidden aspect-[4/5] w-[clamp(11rem,17vw,17rem)] overflow-hidden rounded-sm lg:block"
              style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
              initial={{ opacity: 0, scale: 0.86, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PREVIEWS[hovered]?.src}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-bone/15" />
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="border-t border-bone/12">
          {services.map((s, i) => (
            <motion.li
              key={s.n}
              className="group relative border-b border-bone/12"
              onPointerEnter={() => setHovered(i)}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
            >
              {/* Ember wipe fills the row from the left on hover */}
              <span className="pointer-events-none absolute inset-0 -z-10 origin-left scale-x-0 bg-ember/8 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />

              <div className="flex flex-col gap-3 py-7 md:flex-row md:items-baseline md:gap-10">
                <span className="font-mono text-[0.7rem] tracking-[0.2em] text-muted transition-colors duration-500 group-hover:text-ember md:w-14">
                  {s.n}
                </span>

                <h3 className="display text-[clamp(1.6rem,3.6vw,3rem)] text-bone transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] md:w-[38%] md:group-hover:translate-x-3">
                  {s.title}
                </h3>

                <p className="max-w-xl flex-1 text-[0.93rem] leading-relaxed text-bone-dim transition-colors duration-500 group-hover:text-bone/85">
                  {s.body}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
