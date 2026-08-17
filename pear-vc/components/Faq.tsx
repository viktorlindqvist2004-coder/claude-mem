"use client";

import { useState } from "react";
import RevealText from "./RevealText";

const QUESTIONS = [
  {
    q: "How early is early?",
    a: "Before revenue, usually before the product. We have written first cheques into a repository with four commits and a thesis. What we need is a founder who has clearly been thinking about this longer than anyone else in the room.",
  },
  {
    q: "Do you lead rounds?",
    a: "Yes, and we are happy not to. We will set terms and price the round, or we will take our allocation quietly behind someone you would rather have leading. The decision is yours and it does not change our answer.",
  },
  {
    q: "What does 'no fees' actually mean?",
    a: "We do not draw a management fee from committed capital. Our costs come out of our own pocket until the fund returns capital, after which we take carry. Nobody pays us for the privilege of holding the money.",
  },
  {
    q: "How long does a decision take?",
    a: "One week from first conversation to a yes or no, and we will tell you which on a call rather than by email. A no comes with the reasoning, in writing, whether or not you ask for it.",
  },
  {
    q: "What happens after the cheque clears?",
    a: "We take one board observer seat and a standing monthly hour. Beyond that, you set the cadence. The orchard analogy has limits — you are not a tree and we are not going to prune you.",
  },
];

/**
 * FAQ as a set of nodes floating around the orchard.
 *
 * Rows expand by animating grid-template-rows from 0fr to 1fr. That lets the
 * browser interpolate to the answer's real height at the current width — no
 * measurement, no max-height guess that clips long answers on narrow screens.
 */
function FaqRow({
  index,
  question,
  answer,
  open,
  onToggle,
}: {
  index: number;
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-ink/12">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-center gap-6 py-7 text-left md:gap-10"
      >
        <span className="eyebrow w-8 shrink-0 text-ink/40">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="display flex-1 text-[clamp(1.35rem,2.6vw,2.4rem)] transition-opacity group-hover:opacity-60">
          {question}
        </span>
        <span
          className={`relative h-4 w-4 shrink-0 transition-transform duration-500 ${
            open ? "rotate-135" : ""
          }`}
          aria-hidden="true"
        >
          <span className="absolute top-1/2 left-0 h-px w-full bg-ink" />
          <span className="absolute top-0 left-1/2 h-full w-px bg-ink" />
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-8 pl-14 md:pl-18">
            <p className="max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative z-10 overflow-hidden bg-canvas px-6 py-28 text-ink md:px-14 md:py-40"
    >
      {/* Orchard silhouette behind the questions */}
      <svg
        className="pointer-events-none absolute -right-24 bottom-0 h-[85%] w-auto text-ink/[0.05]"
        viewBox="0 0 400 500"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M188 500 L188 300 Q186 250 170 210 L182 205 Q196 240 200 280 Q206 236 226 205 L236 214 Q212 250 208 300 L208 500 Z" />
        <ellipse cx="198" cy="170" rx="130" ry="105" />
        <ellipse cx="110" cy="215" rx="62" ry="48" />
        <ellipse cx="290" cy="220" rx="58" ry="45" />
      </svg>

      <div className="relative mx-auto max-w-[1200px]">
        <RevealText as="p" className="eyebrow mb-6 text-ink/50" stagger={0}>
          Asked before signing
        </RevealText>
        <RevealText
          as="h2"
          className="display mb-16 text-[clamp(2.5rem,6vw,5.5rem)] md:mb-24"
        >
          Questions we would ask us
        </RevealText>

        <div>
          {QUESTIONS.map((item, i) => (
            <FaqRow
              key={item.q}
              index={i}
              question={item.q}
              answer={item.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
