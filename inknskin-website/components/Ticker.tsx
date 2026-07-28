"use client";

import Marquee from "@/components/ui/Marquee";

const ITEMS = [
  "CUSTOM DESIGN",
  "FINELINE",
  "BLACKWORK",
  "COVER-UP",
  "LETTERING",
  "ORNAMENTAL",
  "RETUSCH",
  "SVARTGRÅTT",
];

export default function Ticker() {
  return (
    <div className="relative border-y border-bone/10 bg-ink py-5">
      <Marquee baseSpeed={70} direction={-1}>
        {ITEMS.map((item, i) => (
          <span key={`${item}-${i}`} className="flex shrink-0 items-center">
            <span className="display px-7 text-[clamp(1.1rem,2.4vw,2rem)] text-bone/85">
              {item}
            </span>
            <span className="h-1.5 w-1.5 rotate-45 bg-ember" aria-hidden />
          </span>
        ))}
      </Marquee>
      {/* Edge fades keep the band from colliding with the page gutter */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}
