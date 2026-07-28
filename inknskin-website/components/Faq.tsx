"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { faq } from "@/lib/site";
import { MaskUp } from "@/components/ui/SplitText";

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="edge relative py-[clamp(5rem,12vh,9rem)]">
      <div className="flex items-baseline gap-4">
        <span className="eyebrow">07 — Vanliga frågor</span>
        <span className="hairline flex-1" />
      </div>

      <div className="mt-12 grid gap-12 md:grid-cols-[0.7fr_1.3fr] md:gap-20">
        <MaskUp className="md:sticky md:top-32 md:h-fit md:self-start">
          <h2 className="display t-lg text-bone">Frågor & svar</h2>
        </MaskUp>

        <ul className="border-t border-bone/12">
          {faq.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q} className="border-b border-bone/12">
                <motion.button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="group flex w-full items-start justify-between gap-6 py-6 text-left"
                  aria-expanded={isOpen}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                >
                  <span
                    className={`text-[clamp(1rem,1.7vw,1.25rem)] font-medium transition-colors duration-400 ${
                      isOpen ? "text-bone" : "text-bone/75 group-hover:text-bone"
                    }`}
                  >
                    {item.q}
                  </span>

                  {/* Plus that rotates into a minus */}
                  <span className="relative mt-1.5 block h-3.5 w-3.5 shrink-0">
                    <motion.span
                      className="absolute left-0 top-1/2 block h-px w-full bg-ember"
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <motion.span
                      className="absolute left-1/2 top-0 block h-full w-px bg-ember"
                      animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </span>
                </motion.button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-7 text-[0.95rem] leading-relaxed text-bone-dim">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
