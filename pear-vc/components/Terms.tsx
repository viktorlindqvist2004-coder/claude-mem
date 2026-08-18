"use client";

import RevealText from "./RevealText";
import TermsCard from "./TermsCard";
import { scrollToSection } from "@/lib/scroll";

/**
 * The terms section.
 *
 * Extracted from `Story` so it can sit under the film. The film carries the
 * argument; this is where the argument gets specific, and it needs to be a
 * normal, readable, linkable section rather than a moment in a shot.
 */
export default function Terms() {
  return (
    <section
      id="terms"
      className="relative flex min-h-screen items-center bg-field px-6 py-28 text-white md:px-14"
    >
      <div className="rule-v left-[7%] hidden md:block" />
      <div className="relative mx-auto grid w-full max-w-[1600px] items-center gap-12 lg:grid-cols-[1fr_minmax(0,30rem)]">
        <div className="max-w-md md:pl-10">
          <RevealText as="p" className="mb-6" stagger={0}>
            <span className="chip">04 / Terms</span>
          </RevealText>
          <RevealText
            as="h2"
            className="display text-[clamp(1.6rem,2.7vw,2.9rem)]"
          >
            Nothing up front
          </RevealText>
          <RevealText
            as="p"
            className="mt-6 text-sm leading-relaxed text-white/75 md:text-[0.95rem]"
          >
            No management fee, for the life of the fund. We are paid out of what
            the company earns, never out of what it raises — so the money you
            bank stays money you can spend.
          </RevealText>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              onClick={() => scrollToSection("apply")}
              className="eyebrow bg-white px-6 py-3 text-ink transition-transform duration-[var(--dur-quick)] ease-[var(--ease-signature)] hover:-translate-y-0.5"
            >
              Apply for funding
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="eyebrow border border-white/40 px-6 py-3 text-white transition-colors duration-[var(--dur-quick)] ease-[var(--ease-signature)] hover:bg-white/10"
            >
              Read the questions
            </button>
          </div>
        </div>
        <TermsCard />
      </div>
    </section>
  );
}
