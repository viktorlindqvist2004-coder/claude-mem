"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SequenceScrubber from "./SequenceScrubber";
import { prefersReducedMotion } from "@/lib/scroll";
import { FILM_CHAPTERS, filmHeightVh } from "@/lib/film";

const SECTION_ID = "film";

/** Fraction of a chapter's span spent fading in, and again fading out. */
const FADE = 0.28;
/** How far the copy drifts across its span, in pixels. */
const DRIFT = 30;

/**
 * The film.
 *
 * One continuous shot sequence occupying the whole top of the page. The canvas
 * is sticky, so the scroll distance is spent advancing frames rather than
 * moving the picture; the copy is absolutely positioned over it and its
 * visibility is a function of the same scroll progress.
 *
 * This replaces the earlier arrangement, where a fixed WebGL canvas cross-faded
 * between five stills while ordinary sections scrolled past it. That could
 * imitate a camera move over a photograph but never the thing itself moving —
 * no hands, no cloth, no cut. Here the motion is in the footage, and the page
 * does nothing to it except decide which frame you are looking at.
 */
export default function FilmSequence({ frames }: { frames: string[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || frames.length === 0) return;

    const chapters = Array.from(
      root.querySelectorAll<HTMLElement>("[data-chapter]")
    );
    if (chapters.length === 0) return;

    // Reduced motion: the film does not scrub, so hold every chapter legible
    // rather than leaving the copy at whatever opacity the scroll left it.
    if (prefersReducedMotion()) {
      chapters.forEach((el) => gsap.set(el, { opacity: 1, y: 0 }));
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const setters = chapters.map((el) => ({
      opacity: gsap.quickSetter(el, "opacity") as (v: number) => void,
      y: gsap.quickSetter(el, "y", "px") as (v: number) => void,
    }));

    const apply = (progress: number) => {
      FILM_CHAPTERS.forEach((chapter, i) => {
        const span = chapter.until - chapter.at;
        const t = (progress - chapter.at) / span;

        // Outside its span the chapter is simply not there.
        if (t <= 0 || t >= 1) {
          setters[i].opacity(0);
          return;
        }

        // Trapezoid: rise, hold, fall. Holding is what makes it readable —
        // a pure triangle is only ever fully opaque for one instant.
        const opacity = Math.min(1, Math.min(t, 1 - t) / FADE);
        setters[i].opacity(opacity);
        setters[i].y((0.5 - t) * DRIFT);
      });
    };

    const trigger = ScrollTrigger.create({
      trigger: `#${SECTION_ID}`,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => apply(self.progress),
    });

    apply(0);

    return () => {
      trigger.kill();
    };
  }, [frames.length]);

  if (frames.length === 0) return null;

  return (
    <section
      id={SECTION_ID}
      className="relative z-10 bg-ink"
      style={{ height: `${filmHeightVh(frames.length)}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <SequenceScrubber
          frames={frames}
          triggerId={SECTION_ID}
          className="absolute inset-0 h-full w-full"
        />

        {/* The footage runs from deep blue to bright linen, so a fixed scrim
            would be wrong half the time. This one is weak and directional —
            enough to seat the type, not enough to grey the picture. */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/55 via-black/10 to-black/40" />

        <div ref={rootRef} className="relative h-full">
          {FILM_CHAPTERS.map((chapter) => (
            <div
              key={chapter.heading}
              data-chapter
              className="pointer-events-none absolute inset-0 flex items-center px-6 opacity-0 md:px-14"
            >
              <div className="mx-auto w-full max-w-[1600px]">
                <div
                  className={
                    chapter.align === "right"
                      ? "max-w-md md:ml-auto md:mr-[6%]"
                      : "max-w-md md:ml-[6%]"
                  }
                >
                  {chapter.label && (
                    <p className="mb-6">
                      <span className="chip">{chapter.label}</span>
                    </p>
                  )}
                  <h2 className="display text-[clamp(1.9rem,3.4vw,3.4rem)] text-white">
                    {chapter.heading}
                  </h2>
                  <p className="mt-6 text-sm leading-relaxed text-white/80 md:text-[0.95rem]">
                    {chapter.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
