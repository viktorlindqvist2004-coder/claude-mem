"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { artists } from "@/lib/site";
import { images, videos } from "@/lib/media";
import { MaskUp } from "@/components/ui/SplitText";

const PORTRAITS = [images.arm, images.needle];

export default function Artists() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section
      ref={ref}
      id="tatuerare"
      className="relative overflow-hidden py-[clamp(5rem,12vh,9rem)]"
    >
      {/* Barely-there footage wash behind the whole section */}
      <motion.div className="absolute inset-0 -z-10 opacity-[0.13]" style={{ y: bgY }} aria-hidden>
        <video
          className="h-[116%] w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={videos.needle.poster}
        >
          <source src={videos.needle.src} type="video/mp4" />
        </video>
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink via-ink/80 to-ink" aria-hidden />

      <div className="edge">
        <div className="flex items-baseline gap-4">
          <span className="eyebrow">04 — Tatuerare</span>
          <span className="hairline flex-1" />
        </div>

        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <MaskUp>
            <h2 className="display t-xl text-bone">Händerna</h2>
          </MaskUp>
          <p className="max-w-sm pb-3 text-[0.93rem] leading-relaxed text-bone-dim">
            Två tatuerare, ett rum. Båda med lång erfarenhet av att tatuera alla
            typer av stilar och motiv — säg vad du vill ha så säger vi vem av oss
            som passar bäst för jobbet.
          </p>
        </div>

        <div className="mt-16 grid gap-14 md:grid-cols-2 md:gap-10">
          {artists.map((a, i) => (
            <motion.article
              key={a.name}
              className="group relative"
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: i * 0.12 }}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-ink-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PORTRAITS[i]?.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover grayscale transition-all duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] group-hover:grayscale-0"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />

                <span className="absolute left-5 top-5 font-mono text-[0.7rem] tracking-[0.22em] text-bone/60">
                  0{i + 1}
                </span>

                <div className="absolute inset-x-5 bottom-5">
                  {/* Archivo's width axis stretches on hover — pure CSS transition */}
                  <h3
                    className="display text-[clamp(2.2rem,5.4vw,3.8rem)] text-bone transition-[font-variation-settings] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ fontVariationSettings: '"wdth" 100' }}
                  >
                    <span className="block group-hover:[font-variation-settings:'wdth'_118]">
                      {a.name}
                    </span>
                  </h3>
                  <p className="mt-1 text-[0.72rem] uppercase tracking-[0.2em] text-ember">
                    {a.role}
                  </p>
                </div>
              </div>

              <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-bone-dim">
                {a.bio}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {a.focus.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-bone/18 px-3.5 py-1.5 text-[0.68rem] uppercase tracking-[0.14em] text-bone-dim transition-colors duration-500 group-hover:border-bone/35"
                  >
                    {f}
                  </span>
                ))}
                {"handleUrl" in a && a.handleUrl ? (
                  <a
                    href={a.handleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-ember/40 px-3.5 py-1.5 text-[0.68rem] uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-ink"
                  >
                    {a.handle}
                  </a>
                ) : null}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
