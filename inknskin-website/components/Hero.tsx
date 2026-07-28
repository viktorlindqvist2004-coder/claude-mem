"use client";

import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { useRef } from "react";
import { videos } from "@/lib/media";
import { contact } from "@/lib/site";

const LINES = ["INK", "N SKIN"];

export default function Hero() {
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // The film keeps creeping forward as the page leaves — a slow parallax exit.
  const mediaY = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const mediaScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.28]);
  const veil = useTransform(scrollYProgress, [0, 1], [0.42, 0.92]);

  // Type lifts out faster than the film behind it.
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-120%"]);
  const titleBlur = useTransform(scrollYProgress, [0, 0.7], ["blur(0px)", "blur(14px)"]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const smoothTitleY = useSpring(titleY, { stiffness: 180, damping: 32, mass: 0.6 });

  return (
    <section
      ref={ref}
      id="top"
      className="vignette relative h-[100svh] w-full overflow-hidden"
    >
      {/* Cinematic backplate */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={{ y: mediaY, scale: mediaScale }}
      >
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={videos.hero.poster}
          aria-hidden
        >
          <source src={videos.hero.src} type="video/mp4" />
        </video>
      </motion.div>

      <motion.div
        className="absolute inset-0 -z-10 bg-ink"
        style={{ opacity: veil }}
        aria-hidden
      />
      {/* Bottom fade so the type always has something to sit on */}
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-ink via-ink/70 to-transparent"
        aria-hidden
      />

      <div className="edge relative flex h-full flex-col justify-end pb-[clamp(1.75rem,5vh,3.5rem)]">
        <motion.h1
          className="display t-mega text-bone"
          style={{ y: smoothTitleY, filter: titleBlur, opacity: titleOpacity }}
        >
          {LINES.map((lineText, li) => (
            <span key={lineText} className="mask-line">
              <motion.span
                className="block will-change-transform"
                initial={{ y: "112%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{
                  duration: 1.5,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 1.35 + li * 0.11,
                }}
              >
                {lineText}
                {li === LINES.length - 1 && (
                  <motion.span
                    className="ml-[0.12em] inline-block h-[0.13em] w-[0.13em] rounded-full bg-ember align-baseline"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 2.4, type: "spring", stiffness: 260, damping: 14 }}
                  />
                )}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        <motion.div
          className="mt-8 flex flex-col gap-8 border-t border-bone/12 pt-6 md:flex-row md:items-end md:justify-between"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 1.95 }}
        >
          <p className="max-w-md text-[0.95rem] leading-relaxed text-bone-dim">
            Tatueringsstudio mitt i Trollhättan. Custom design, fineline, blackwork
            och cover-up — utfört av två tatuerare med lång erfarenhet av alla
            stilar och motiv.
          </p>

          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div className="flex flex-col gap-1">
              <span className="eyebrow">Adress</span>
              <a
                href={contact.mapsUrl}
                target="_blank"
                rel="noreferrer"
                data-cursor="Karta"
                className="text-sm text-bone transition-colors hover:text-ember"
              >
                {contact.street}
                <br />
                {contact.postal} {contact.city}
              </a>
            </div>
            <div className="flex flex-col gap-1">
              <span className="eyebrow">Bemannat</span>
              <span className="text-sm text-bone">
                Mån–Fre
                <br />
                12:00 – 16:30
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 1 }}
        style={{ opacity: titleOpacity }}
      >
        <span className="eyebrow text-[0.6rem]">Scrolla</span>
        <span className="relative block h-10 w-px overflow-hidden bg-bone/20">
          <motion.span
            className="absolute inset-x-0 top-0 block h-4 bg-ember"
            animate={{ y: ["-100%", "260%"] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  );
}
