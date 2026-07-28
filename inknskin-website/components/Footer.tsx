"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { contact, site } from "@/lib/site";

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });

  // The wordmark rises and settles as the last of the page arrives.
  const y = useTransform(scrollYProgress, [0, 1], ["22%", "0%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.25, 1]);

  const year = new Date().getFullYear();

  return (
    <footer ref={ref} className="relative overflow-hidden border-t border-bone/10 pt-16">
      <div className="edge flex flex-col gap-10 pb-14 md:flex-row md:justify-between">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Studion</span>
          <a
            href={contact.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[0.92rem] leading-relaxed text-bone transition-colors hover:text-ember"
          >
            {contact.street}
            <br />
            {contact.postal} {contact.city}
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <span className="eyebrow">Följ</span>
          <a
            href={contact.instagram}
            target="_blank"
            rel="noreferrer"
            className="text-[0.92rem] text-bone transition-colors hover:text-ember"
          >
            Instagram {contact.instagramHandle}
          </a>
          <a
            href={contact.tiktok}
            target="_blank"
            rel="noreferrer"
            className="text-[0.92rem] text-bone transition-colors hover:text-ember"
          >
            TikTok {contact.tiktokHandle}
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <span className="eyebrow">Bemannat</span>
          <span className="text-[0.92rem] leading-relaxed text-bone">
            Mån–Fre 12:00 – 16:30
            <br />
            <span className="text-muted">Övriga tider via DM</span>
          </span>
        </div>

        <a
          href="#top"
          data-cursor="Upp"
          className="group flex h-fit items-center gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-bone-dim transition-colors hover:text-bone"
        >
          <span className="transition-transform duration-500 group-hover:-translate-y-1">↑</span>
          Till toppen
        </a>
      </div>

      {/* Oversized wordmark bleeding off the bottom edge */}
      <motion.div
        className="edge select-none"
        style={{ y, opacity }}
        aria-hidden
      >
        <span className="display block w-full text-center text-[clamp(3.5rem,19vw,17rem)] leading-[0.8] tracking-[-0.05em] text-bone/90">
          INK N SKIN
        </span>
      </motion.div>

      <div className="edge flex flex-col gap-2 border-t border-bone/10 py-6 text-[0.72rem] text-muted md:flex-row md:items-center md:justify-between">
        <span>
          © {year} {site.legalName}
        </span>
        <span>Tatueringsstudio i Trollhättan · 18 år och giltig legitimation krävs</span>
      </div>
    </footer>
  );
}
