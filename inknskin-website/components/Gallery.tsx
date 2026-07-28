"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { galleryColumns, type Asset } from "@/lib/media";
import { MaskUp } from "@/components/ui/SplitText";
import { contact } from "@/lib/site";

function Tile({ asset, index }: { asset: Asset; index: number }) {
  return (
    <motion.figure
      className="group relative overflow-hidden rounded-sm bg-ink-2"
      initial={{ clipPath: "inset(14% 14% 14% 14%)", opacity: 0 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1], delay: (index % 3) * 0.08 }}
      data-cursor="Se mer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
      />
      <div className="pointer-events-none absolute inset-0 bg-ink/25 transition-opacity duration-700 group-hover:opacity-0" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-bone/10" />
    </motion.figure>
  );
}

/** One column that drifts at its own rate as the section passes the viewport. */
function Column({
  assets,
  speed,
  className = "",
}: {
  assets: Asset[];
  speed: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed}%`, `${-speed}%`]);

  return (
    <motion.div ref={ref} style={{ y }} className={`flex flex-col gap-4 md:gap-6 ${className}`}>
      {assets.map((a, i) => (
        <Tile key={`${a.local}-${i}`} asset={a} index={i} />
      ))}
    </motion.div>
  );
}

export default function Gallery() {
  return (
    <section id="arbeten" className="relative py-[clamp(5rem,12vh,9rem)]">
      <div className="edge">
        <div className="flex items-baseline gap-4">
          <span className="eyebrow">03 — Arbeten</span>
          <span className="hairline flex-1" />
        </div>

        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <MaskUp>
            <h2 className="display t-xl text-bone">Portfolio</h2>
          </MaskUp>
          <p className="max-w-sm pb-3 text-[0.93rem] leading-relaxed text-bone-dim">
            Ett urval från studion. Hela flödet med färska jobb, pågående projekt
            och lediga tider ligger på Instagram.
          </p>
        </div>
      </div>

      <div className="edge mt-14">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          <Column assets={galleryColumns[0]} speed={7} />
          <Column assets={galleryColumns[1]} speed={-9} className="md:pt-16" />
          <Column
            assets={galleryColumns[2]}
            speed={5}
            className="hidden md:flex md:pt-6"
          />
        </div>
      </div>

      <div className="edge mt-14 flex justify-center">
        <a
          href={contact.instagram}
          target="_blank"
          rel="noreferrer"
          data-cursor="Instagram"
          className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-bone/25 px-8 py-4"
        >
          <span className="absolute inset-0 translate-y-full bg-bone transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
          <span className="relative z-10 text-[0.75rem] font-medium uppercase tracking-[0.18em] text-bone transition-colors duration-500 group-hover:text-ink">
            Se hela flödet {contact.instagramHandle}
          </span>
          <span className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">
            <Arrow />
          </span>
        </a>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 13L13 3M13 3H5.5M13 3v7.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
