"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import RevealText from "./RevealText";
import TermsCard from "./TermsCard";
import { prefersReducedMotion, scrollToSection } from "@/lib/scroll";

/**
 * One beat of the story.
 *
 * Sections fill the viewport but grow past it when the copy needs the room —
 * StoryCanvas reads their real offsets, so a taller section simply gets a
 * longer scene rather than knocking the portals out of sync.
 *
 * Copy fades and blurs out before the portal opens, so the mask never cuts
 * through live text.
 */
function StorySection({
  id,
  align = "left",
  width = "max-w-2xl",
  children,
}: {
  id?: string;
  align?: "left" | "right" | "center";
  width?: string;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const inner = innerRef.current;
    if (!section || !inner || prefersReducedMotion()) return;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      gsap.to(inner, {
        opacity: 0,
        y: -60,
        filter: "blur(10px)",
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "45% top",
          end: "85% top",
          scrub: true,
        },
      });
    }, sectionRef);

    return () => context.revert();
  }, []);

  const justify =
    align === "right"
      ? "justify-end text-left"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start";

  // The painted scenes are busy — canopies, bokeh, drapery. A directional
  // scrim keeps white type readable over any of them without flattening the
  // artwork the way a full-screen overlay would.
  const scrim =
    align === "right"
      ? "bg-linear-to-l from-black/55 via-black/20 to-transparent"
      : align === "center"
        ? "bg-linear-to-b from-black/15 via-black/50 to-black/15"
        : "bg-linear-to-r from-black/55 via-black/20 to-transparent";

  return (
    <section
      ref={sectionRef}
      id={id}
      className="relative flex min-h-screen items-center py-28 px-6 md:px-14"
    >
      <div className={`pointer-events-none absolute inset-0 ${scrim}`} />
      <div className={`relative mx-auto flex w-full max-w-[1600px] ${justify}`}>
        <div ref={innerRef} className={width}>
          {children}
        </div>
      </div>
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <RevealText
      as="p"
      className="eyebrow mb-6 flex items-center gap-3 text-canvas/75"
      stagger={0}
    >
      {children}
    </RevealText>
  );
}

export default function Story() {
  return (
    <div id="story" className="relative z-10 text-canvas">
      {/* ---- Scene 0 — Hero ------------------------------------------- */}
      <StorySection id="hero" width="max-w-3xl">
        <Eyebrow>Pear · Seed stage</Eyebrow>
        <RevealText
          as="h1"
          className="display text-[clamp(2.75rem,7.5vw,7rem)]"
          stagger={0.12}
        >
          Plant early. Tend patiently.
        </RevealText>
        <RevealText
          as="p"
          className="mt-10 max-w-md text-lg leading-relaxed text-canvas/85 md:mt-12 md:text-xl"
          delay={0.25}
        >
          We back founders at the very beginning — and stay in the orchard until
          the fruit sets.
        </RevealText>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            onClick={() => scrollToSection("apply")}
            className="eyebrow rounded-full bg-canvas px-7 py-3.5 text-ink transition-transform hover:-translate-y-0.5"
          >
            Apply for funding
          </button>
          <button
            onClick={() => scrollToSection("terms")}
            className="eyebrow rounded-full border border-canvas/40 px-7 py-3.5 text-canvas transition-colors hover:bg-canvas/10"
          >
            See the terms
          </button>
        </div>

        <p className="eyebrow mt-16 flex items-center gap-3 text-canvas/60">
          <span className="inline-block h-8 w-px animate-pulse bg-canvas/50" />
          Scroll to begin
        </p>
      </StorySection>

      {/* ---- Scene 1 — We build it ------------------------------------ */}
      <StorySection>
        <Eyebrow>01 / Graft</Eyebrow>
        <RevealText as="h2" className="display text-[clamp(2.5rem,7vw,6.5rem)]">
          We build it
        </RevealText>
        <RevealText
          as="p"
          className="mt-10 md:mt-12 text-lg leading-relaxed text-canvas/85 md:text-xl"
          delay={0.15}
        >
          A graft only takes when the cut faces meet exactly. We join what you
          are making to root systems that already hold — operators, first
          customers, and capital that has weathered a winter.
        </RevealText>
      </StorySection>

      {/* ---- Scene 2 — We rank it ------------------------------------- */}
      <StorySection align="right">
        <Eyebrow>02 / Yield</Eyebrow>
        <RevealText as="h2" className="display text-[clamp(2.5rem,7vw,6.5rem)]">
          We rank it
        </RevealText>
        <RevealText
          as="p"
          className="mt-10 md:mt-12 text-lg leading-relaxed text-canvas/85 md:text-xl"
          delay={0.15}
        >
          Every branch is measured against every other. We grade the fruit
          honestly and in the open, so the strongest work gets the light — and
          the rest gets the truth early enough to matter.
        </RevealText>
      </StorySection>

      {/* ---- Scene 3 — We share in what it earns ---------------------- */}
      <StorySection align="center">
        <Eyebrow>03 / Split</Eyebrow>
        <RevealText
          as="h2"
          className="display text-[clamp(2.5rem,7vw,6.5rem)]"
          stagger={0.1}
        >
          We share in what it earns
        </RevealText>
        <RevealText
          as="p"
          className="mx-auto mt-10 md:mt-12 max-w-xl text-lg leading-relaxed text-canvas/85 md:text-xl"
          delay={0.15}
        >
          The pear is opened where everyone can see it. What the orchard earns
          is divided the way it was grown — together, and on terms written down
          before the first season.
        </RevealText>
      </StorySection>

      {/* ---- Scene 4 — Terms ------------------------------------------ */}
      <section
        id="terms"
        className="relative flex min-h-screen items-center py-28 px-6 md:px-14"
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/50 via-black/20 to-black/25" />
        <div className="relative mx-auto grid w-full max-w-[1600px] items-center gap-12 lg:grid-cols-[1fr_minmax(0,32rem)]">
          <div>
            <Eyebrow>04 / Terms</Eyebrow>
            <RevealText
              as="h2"
              className="display text-[clamp(2.25rem,5.5vw,5rem)]"
            >
              No fees. A share of the upside.
            </RevealText>
            <RevealText
              as="p"
              className="mt-10 md:mt-12 max-w-lg text-lg leading-relaxed text-canvas/85"
              delay={0.15}
            >
              We do not charge management fees. We are paid when you are — out
              of what the company earns, never out of what it raises.
            </RevealText>
          </div>
          <TermsCard />
        </div>
      </section>
    </div>
  );
}
