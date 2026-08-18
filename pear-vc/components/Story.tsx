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
 * Two kinds. A `field` beat is a flat blue plane with hairline structure and a
 * narrow column of small type — opaque, so it covers the fixed WebGL canvas
 * entirely. An `image` beat is transparent and lets the painting through
 * full-bleed.
 *
 * Alternating them is the point: imagery lands as an event between quiet
 * planes rather than running continuously underneath everything, which is what
 * gives the page a rhythm instead of one unbroken texture.
 *
 * Sections fill the viewport but grow past it when the copy needs the room —
 * StoryCanvas reads their real offsets, so a taller section simply gets a
 * longer scene rather than knocking the transitions out of sync.
 */
function StorySection({
  id,
  variant = "field",
  children,
}: {
  id?: string;
  variant?: "field" | "image";
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
        y: -40,
        filter: "blur(8px)",
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

  const field = variant === "field";

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`relative flex min-h-screen items-center px-6 py-28 text-white md:px-14 ${
        field ? "bg-field" : ""
      }`}
    >
      {field ? (
        <>
          <div className="rule-v left-[7%] hidden md:block" />
          <div className="rule-v left-[57%] hidden md:block" />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/55 via-black/15 to-transparent" />
      )}

      <div className="relative mx-auto w-full max-w-[1600px]">
        <div
          ref={innerRef}
          className={field ? "max-w-md md:ml-[57%] md:pl-10" : "max-w-md"}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <RevealText as="p" className="mb-6" stagger={0}>
      <span className="chip">{children}</span>
    </RevealText>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <RevealText
      as="h2"
      className="display text-[clamp(1.6rem,2.7vw,2.9rem)]"
      stagger={0.08}
    >
      {children}
    </RevealText>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <RevealText
      as="p"
      className="mt-6 text-sm leading-relaxed text-white/75 md:text-[0.95rem]"
      delay={0.12}
    >
      {children}
    </RevealText>
  );
}

export default function Story() {
  return (
    <div id="story" className="relative z-10">
      {/* ---- Scene 0 — Hero, full-bleed ------------------------------- */}
      <StorySection id="hero" variant="image">
        <Label>Pear · Seed stage</Label>
        <RevealText
          as="h1"
          className="display text-[clamp(2rem,4.2vw,4.25rem)]"
          stagger={0.1}
        >
          Plant early. Tend patiently.
        </RevealText>
        <Body>
          We back founders at the very beginning — and stay in the orchard until
          the fruit sets.
        </Body>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <button
            onClick={() => scrollToSection("apply")}
            className="eyebrow bg-white px-6 py-3 text-ink transition-transform duration-[var(--dur-quick)] ease-[var(--ease-signature)] hover:-translate-y-0.5"
          >
            Apply for funding
          </button>
          <button
            onClick={() => scrollToSection("terms")}
            className="eyebrow border border-white/40 px-6 py-3 text-white transition-colors duration-[var(--dur-quick)] ease-[var(--ease-signature)] hover:bg-white/10"
          >
            See the terms
          </button>
        </div>
      </StorySection>

      {/* ---- Scene 1 — field ------------------------------------------ */}
      <StorySection>
        <Label>01 / Rootstock</Label>
        <Heading>We join early</Heading>
        <Body>
          A graft only takes where the cut faces meet exactly. We come in at
          that seam — early enough to matter, close enough that our work shows
          up in yours, and never so heavy that the join is what you feel.
        </Body>
      </StorySection>

      {/* ---- Scene 2 — full-bleed ------------------------------------- */}
      <StorySection variant="image">
        <Label>02 / Season</Label>
        <Heading>We measure out loud</Heading>
        <Body>
          You will hear what we actually think, on a schedule, in writing.
          Praise that is not load-bearing helps nobody, and a hard read
          delivered in month four is worth more than a kind one in month ten.
        </Body>
      </StorySection>

      {/* ---- Scene 3 — field ------------------------------------------ */}
      <StorySection>
        <Label>03 / Harvest</Label>
        <Heading>We eat what we grow</Heading>
        <Body>
          Our return arrives the same way yours does and no sooner. That is
          the whole alignment: if the orchard has a bad year, so do we, and
          nothing in the paperwork lets us step around it.
        </Body>
      </StorySection>

      {/* ---- Scene 4 — field, with the terms card --------------------- */}
      <section
        id="terms"
        className="relative flex min-h-screen items-center bg-field px-6 py-28 text-white md:px-14"
      >
        <div className="rule-v left-[7%] hidden md:block" />
        <div className="relative mx-auto grid w-full max-w-[1600px] items-center gap-12 lg:grid-cols-[1fr_minmax(0,30rem)]">
          <div className="max-w-md md:pl-10">
            <Label>04 / Terms</Label>
            <Heading>Nothing up front</Heading>
            <Body>
              No management fee, for the life of the fund. We are paid out of
              what the company earns, never out of what it raises — so the
              money you bank stays money you can spend.
            </Body>
          </div>
          <TermsCard />
        </div>
      </section>
    </div>
  );
}
