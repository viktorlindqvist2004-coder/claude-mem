"use client";

import { motion } from "motion/react";
import { reviews, reviewCount, averageRating, REVIEWS_VERIFIED, type Review } from "@/lib/reviews";
import Marquee from "@/components/ui/Marquee";
import Counter from "@/components/ui/Counter";
import { MaskUp } from "@/components/ui/SplitText";
import { contact } from "@/lib/site";

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-1" aria-label={`${n} av 5 stjärnor`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"
            fill={i < n ? "var(--color-ember)" : "transparent"}
            stroke="var(--color-ember)"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

function Card({ review }: { review: Review }) {
  return (
    <article className="mx-3 flex w-[clamp(19rem,29vw,26rem)] shrink-0 flex-col justify-between gap-6 rounded-sm border border-bone/12 bg-ink-2/70 p-7 backdrop-blur-sm transition-colors duration-500 hover:border-bone/25">
      <Stars n={review.rating} />
      <p className="text-[0.95rem] leading-relaxed text-bone/85">“{review.body}”</p>
      <footer className="flex items-end justify-between gap-4 border-t border-bone/10 pt-4">
        <div>
          <div className="text-[0.82rem] text-bone">{review.author}</div>
          {review.context ? (
            <div className="mt-0.5 text-[0.7rem] uppercase tracking-[0.14em] text-muted">
              {review.context}
            </div>
          ) : null}
        </div>
        {review.source ? (
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">
            {review.source}
          </span>
        ) : null}
      </footer>
    </article>
  );
}

export default function Reviews() {
  const rowA = reviews.slice(0, Math.ceil(reviews.length / 2));
  const rowB = reviews.slice(Math.ceil(reviews.length / 2));

  return (
    <section id="omdomen" className="relative overflow-hidden py-[clamp(5rem,12vh,9rem)]">
      <div className="edge">
        <div className="flex items-baseline gap-4">
          <span className="eyebrow">05 — Omdömen</span>
          <span className="hairline flex-1" />
        </div>

        <div className="mt-10 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <MaskUp>
            <h2 className="display t-xl text-bone">Vad kunderna säger</h2>
          </MaskUp>

          <motion.div
            className="flex items-end gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <div className="display flex items-baseline text-[clamp(3rem,7vw,5.5rem)] leading-none text-bone tabular-nums">
                <Counter to={averageRating} decimals={1} />
                <span className="ml-1 text-[0.42em] text-muted">/5</span>
              </div>
              <div className="mt-3">
                <Stars n={Math.round(averageRating)} />
              </div>
            </div>
            <div className="border-l border-bone/12 pl-8">
              <div className="display text-[clamp(1.8rem,4vw,3rem)] leading-none text-bone tabular-nums">
                <Counter to={reviewCount} />
              </div>
              <div className="mt-2 text-[0.7rem] uppercase tracking-[0.16em] text-muted">
                omdömen
              </div>
            </div>
          </motion.div>
        </div>

        {process.env.NODE_ENV !== "production" && !REVIEWS_VERIFIED ? (
          <p className="mt-8 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-[0.8rem] text-bone">
            <strong>Endast synligt i utvecklingsläge:</strong> omdömena nedan är
            platshållare. Ersätt dem med riktiga omdömen i{" "}
            <code className="text-ember">lib/reviews.ts</code> innan sidan
            lanseras, och sätt <code className="text-ember">REVIEWS_VERIFIED</code>{" "}
            till true.
          </p>
        ) : null}
      </div>

      <div className="mt-14 flex flex-col gap-4 md:gap-6">
        <Marquee baseSpeed={38} direction={-1}>
          {rowA.map((r, i) => (
            <Card key={`a-${i}`} review={r} />
          ))}
        </Marquee>
        <Marquee baseSpeed={38} direction={1}>
          {rowB.map((r, i) => (
            <Card key={`b-${i}`} review={r} />
          ))}
        </Marquee>
      </div>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent md:w-32" />

      <div className="edge mt-14 flex justify-center">
        <a
          href={contact.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[0.75rem] uppercase tracking-[0.18em] text-bone-dim underline-offset-8 transition-colors hover:text-ember hover:underline"
        >
          Läs alla omdömen på Google
        </a>
      </div>
    </section>
  );
}
