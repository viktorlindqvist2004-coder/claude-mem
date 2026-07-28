"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const WORDS = ["INK", "N", "SKIN"];

/**
 * Opening curtain: a percentage counter runs up while the wordmark stacks in,
 * then the whole panel splits away upward to hand over to the hero.
 * Skipped entirely for reduced-motion visitors.
 */
export default function Preloader() {
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const start = performance.now();
    const DURATION = 1750;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // ease-out-expo so the number sprints then settles
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setPct(Math.round(eased * 100));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDone(true);
        document.body.style.overflow = "";
        window.scrollTo(0, 0);
      }
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[90] flex flex-col justify-between bg-ink edge py-8"
          exit={{ y: "-100%" }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="flex items-start justify-between">
            <span className="eyebrow">Trollhättan · Sverige</span>
            <span className="eyebrow">Est. Kungsgatan 16B</span>
          </div>

          <div className="flex flex-col items-start">
            {WORDS.map((w, i) => (
              <span key={w} className="block overflow-hidden">
                <motion.span
                  className="display t-xl block text-bone"
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{
                    duration: 1,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.08 * i,
                  }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </div>

          <div className="flex items-end justify-between">
            <span className="eyebrow">Laddar studion</span>
            <span className="display text-[clamp(2.5rem,9vw,7rem)] leading-none text-bone tabular-nums">
              {pct}
              <span className="text-ember">%</span>
            </span>
          </div>

          {/* progress hairline */}
          <motion.div
            className="absolute bottom-0 left-0 h-px bg-ember"
            initial={{ width: "0%" }}
            animate={{ width: `${pct}%` }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
