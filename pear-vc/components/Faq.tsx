"use client";

import { useState } from "react";
import ArtDecor from "./ArtDecor";
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
    <div className="border-b border-white/15">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-center gap-6 py-7 text-left md:gap-10"
      >
        <span className="eyebrow w-8 shrink-0 text-white/45">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="display flex-1 text-[clamp(1.15rem,1.9vw,1.7rem)] transition-opacity duration-[var(--dur-quick)] ease-[var(--ease-signature)] group-hover:opacity-60">
          {question}
        </span>
        <span
          className={`relative h-4 w-4 shrink-0 transition-transform duration-[var(--dur-base)] ${
            open ? "rotate-135" : ""
          }`}
          aria-hidden="true"
        >
          <span className="absolute top-1/2 left-0 h-px w-full bg-white" />
          <span className="absolute top-0 left-1/2 h-full w-px bg-white" />
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-[var(--dur-base)] ease-[var(--ease-signature)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-8 pl-14 md:pl-18">
            <p className="max-w-2xl text-sm leading-relaxed text-white/70 md:text-[0.95rem]">
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Faq({ artwork }: { artwork: string | null }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative z-10 overflow-hidden bg-field px-6 py-28 text-white md:px-14 md:py-40"
    >
      {/* Orchard behind the questions */}
      <ArtDecor
        src={artwork}
        className="pointer-events-none absolute right-0 bottom-0 h-[85%] w-auto max-w-[60%] object-cover opacity-20 [mask-image:linear-gradient(to_left,black,transparent)]"
        fallback={
          <svg
            className="pointer-events-none absolute -right-24 bottom-0 h-[85%] w-auto text-white/[0.07]"
            viewBox="0 0 400 500"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M188 500 L188 300 Q186 250 170 210 L182 205 Q196 240 200 280 Q206 236 226 205 L236 214 Q212 250 208 300 L208 500 Z" />
            <ellipse cx="198" cy="170" rx="130" ry="105" />
            <ellipse cx="110" cy="215" rx="62" ry="48" />
            <ellipse cx="290" cy="220" rx="58" ry="45" />
          </svg>
        }
      />

      <div className="relative mx-auto max-w-[1200px]">
        <RevealText as="p" className="mb-6" stagger={0}>
          <span className="chip">Read this first</span>
        </RevealText>
        <RevealText
          as="h2"
          className="display mb-16 max-w-3xl text-[clamp(1.7rem,2.9vw,3rem)] md:mb-24"
        >
          The parts people ask about twice
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
