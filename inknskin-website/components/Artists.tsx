"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { artists } from "@/lib/site";
import { images, videos, type Asset } from "@/lib/media";
import { MaskUp } from "@/components/ui/SplitText";

type Artist = (typeof artists)[number];

const PORTRAITS: Asset[] = [images.needle, images.arm, images.fineline];

const linkOf = (a: Artist) => ("handleUrl" in a ? a.handleUrl : undefined);

/** Namnet breddas via Archivos width-axel när kortet hovras. */
function Name({ name, className }: { name: string; className: string }) {
  return (
    <h3
      className={`display transition-[font-variation-settings] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
      style={{ fontVariationSettings: '"wdth" 100' }}
    >
      <span className="block group-hover:[font-variation-settings:'wdth'_118]">
        {name}
      </span>
    </h3>
  );
}

function FocusTags({ artist }: { artist: Artist }) {
  const url = linkOf(artist);
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {artist.focus.map((f) => (
        <span
          key={f}
          className="rounded-full border border-bone/18 px-3.5 py-1.5 text-[0.68rem] uppercase tracking-[0.14em] text-bone-dim transition-colors duration-500 group-hover:border-bone/35"
        >
          {f}
        </span>
      ))}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          data-cursor="Instagram"
          className="rounded-full border border-ember/40 px-3.5 py-1.5 text-[0.68rem] uppercase tracking-[0.14em] text-ember transition-colors hover:bg-ember hover:text-ink"
        >
          {artist.handle}
        </a>
      ) : null}
    </div>
  );
}

/** Ensam tatuerare: bild och text sida vid sida, i full sektionsbredd. */
function Solo({ artist }: { artist: Artist }) {
  return (
    <motion.article
      className="group mt-16 grid gap-10 md:grid-cols-[0.82fr_1.18fr] md:items-center md:gap-16"
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="relative aspect-[4/5] overflow-hidden rounded-sm bg-ink-2"
        initial={{ clipPath: "inset(0 0 100% 0)" }}
        whileInView={{ clipPath: "inset(0 0 0% 0)" }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PORTRAITS[0].src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover grayscale transition-all duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] group-hover:grayscale-0"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
        <span className="absolute left-5 top-5 font-mono text-[0.7rem] tracking-[0.22em] text-bone/60">
          01
        </span>
      </motion.div>

      <div>
        <p className="text-[0.72rem] uppercase tracking-[0.2em] text-ember">
          {artist.role}
        </p>
        <Name name={artist.name} className="mt-3 t-lg text-bone" />
        <p className="mt-8 max-w-xl text-[clamp(1rem,1.5vw,1.2rem)] leading-relaxed text-bone-dim">
          {artist.bio}
        </p>
        <FocusTags artist={artist} />
      </div>
    </motion.article>
  );
}

/** Två eller fler: rutnät av porträttkort. */
function Grid({ list }: { list: readonly Artist[] }) {
  return (
    <div className="mt-16 grid gap-14 md:grid-cols-2 md:gap-10">
      {list.map((a, i) => (
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
              src={(PORTRAITS[i] ?? PORTRAITS[0]).src}
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
              <Name name={a.name} className="text-[clamp(2.2rem,5.4vw,3.8rem)] text-bone" />
              <p className="mt-1 text-[0.72rem] uppercase tracking-[0.2em] text-ember">
                {a.role}
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-bone-dim">
            {a.bio}
          </p>
          <FocusTags artist={a} />
        </motion.article>
      ))}
    </div>
  );
}

export default function Artists() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  const solo = artists.length === 1;

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
          <span className="eyebrow">04 — {solo ? "Tatueraren" : "Tatuerare"}</span>
          <span className="hairline flex-1" />
        </div>

        <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <MaskUp>
            <h2 className="display t-xl text-bone">Handen bakom</h2>
          </MaskUp>
          <p className="max-w-sm pb-3 text-[0.93rem] leading-relaxed text-bone-dim">
            {solo
              ? "En tatuerare, ett rum, samma hand från skiss till sista linjen. Säg vad du vill ha så är vi raka med vad som går att göra."
              : "Säg vad du vill ha så säger vi vem av oss som passar bäst för jobbet."}
          </p>
        </div>

        {solo ? <Solo artist={artists[0]} /> : <Grid list={artists} />}
      </div>
    </section>
  );
}
