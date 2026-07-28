"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { contact, nav } from "@/lib/site";
import Magnetic from "@/components/ui/Magnetic";

export default function Nav() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 40);
    // Hide going down past the hero, reveal on any upward intent.
    setHidden(y > prev && y > 520 && !open);
  });

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        animate={{ y: hidden ? "-110%" : "0%" }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={`edge flex items-center justify-between py-5 transition-colors duration-500 ${
            solid
              ? "border-b border-bone/10 bg-ink/70 backdrop-blur-xl"
              : "border-b border-transparent"
          }`}
        >
          <a href="#top" className="group flex items-center gap-3" aria-label="Ink N Skin, till toppen">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
            </span>
            <span className="display text-[0.95rem] tracking-[0.02em] text-bone">
              Ink N Skin
            </span>
          </a>

          <nav className="hidden items-center gap-9 md:flex" aria-label="Huvudmeny">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group relative text-[0.78rem] font-medium uppercase tracking-[0.16em] text-bone-dim transition-colors hover:text-bone"
              >
                {item.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-ember transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Magnetic className="hidden sm:block">
              <a
                href="#kontakt"
                data-cursor="Boka"
                className="group relative inline-flex items-center overflow-hidden rounded-full border border-bone/25 px-6 py-2.5 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-bone"
              >
                <span className="absolute inset-0 -z-0 translate-y-full bg-ember transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
                <span className="relative z-10 transition-colors duration-300 group-hover:text-ink">
                  Boka tid
                </span>
              </a>
            </Magnetic>

            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Stäng meny" : "Öppna meny"}
              aria-expanded={open}
              className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] md:hidden"
            >
              <motion.span
                className="block h-px w-6 bg-bone"
                animate={{ rotate: open ? 45 : 0, y: open ? 3 : 0 }}
              />
              <motion.span
                className="block h-px w-6 bg-bone"
                animate={{ rotate: open ? -45 : 0, y: open ? -3 : 0 }}
              />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-center bg-ink edge md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav className="flex flex-col gap-2" aria-label="Mobilmeny">
              {nav.map((item, i) => (
                <span key={item.href} className="overflow-hidden">
                  <motion.a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="display t-lg block text-bone"
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{
                      duration: 0.8,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.12 + i * 0.06,
                    }}
                  >
                    {item.label}
                  </motion.a>
                </span>
              ))}
            </nav>

            <motion.div
              className="mt-14 flex flex-col gap-1 text-sm text-bone-dim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <a href={contact.instagram} target="_blank" rel="noreferrer" className="hover:text-bone">
                Instagram {contact.instagramHandle}
              </a>
              <span>
                {contact.street}, {contact.postal} {contact.city}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
