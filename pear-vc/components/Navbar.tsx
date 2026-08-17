"use client";

import { useEffect, useState } from "react";
import { scrollToSection } from "@/lib/scroll";

const LINKS = [
  { label: "Model", id: "model" },
  { label: "Terms", id: "terms" },
  { label: "Questions", id: "faq" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    scrollToSection(id);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        lifted ? "bg-canvas/70 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      {/* Before the bar gets its own background, the links sit directly on the
          artwork — which runs from deep blue sky to bright golden haze. A top
          scrim guarantees contrast without tinting the whole frame. */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/50 via-black/20 to-transparent transition-opacity duration-500 ${
          lifted ? "opacity-0" : "opacity-100"
        }`}
      />

      <nav className="relative mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5 md:px-10">
        <button
          onClick={() => go("hero")}
          className={`display text-2xl transition-colors md:text-3xl ${
            lifted ? "text-ink" : "text-canvas"
          }`}
          aria-label="pear. — back to top"
        >
          pear<span className="text-gold">.</span>
        </button>

        <div className="hidden items-center gap-10 md:flex">
          {LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => go(link.id)}
              className={`eyebrow transition-opacity hover:opacity-60 ${
                lifted ? "text-ink" : "text-canvas"
              }`}
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => go("apply")}
            className="eyebrow rounded-full bg-ink px-5 py-2.5 text-canvas transition-transform hover:-translate-y-0.5"
          >
            Apply
          </button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex h-8 w-8 flex-col items-end justify-center gap-1.5 md:hidden ${
            lifted || open ? "text-ink" : "text-canvas"
          }`}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span
            className={`h-px bg-current transition-all duration-300 ${
              open ? "w-6 translate-y-[3.5px] rotate-45" : "w-6"
            }`}
          />
          <span
            className={`h-px bg-current transition-all duration-300 ${
              open ? "w-6 -translate-y-[3.5px] -rotate-45" : "w-4"
            }`}
          />
        </button>
      </nav>

      <div
        className={`overflow-hidden bg-canvas transition-[max-height] duration-500 md:hidden ${
          open ? "max-h-72" : "max-h-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-6 pb-6">
          {[...LINKS, { label: "Apply", id: "apply" }].map((link) => (
            <button
              key={link.id}
              onClick={() => go(link.id)}
              className="display border-b border-ink/10 py-3 text-left text-3xl text-ink"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
