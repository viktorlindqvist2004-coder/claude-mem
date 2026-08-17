"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The technical layer: fine grid, corner crosshairs and a live coordinate
 * readout. It is the connective tissue between the painted scenes and the
 * modern type — the same drafting language appears inside the artwork itself.
 */
export default function HudOverlay() {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [depth, setDepth] = useState(0);
  const frame = useRef<number | null>(null);
  const pending = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const flush = () => {
      frame.current = null;
      setCoords({
        x: Math.round(pending.current.x),
        y: Math.round(pending.current.y),
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      pending.current = { x: event.clientX, y: event.clientY };
      // One state update per frame; pointermove fires far more often.
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    };

    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      setDepth(max > 0 ? Math.round((window.scrollY / max) * 1000) / 10 : 0);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  // Difference blending keeps the readout legible over both the deep sky
  // scenes and the off-white sections without tracking which sits behind it.
  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 hidden text-white mix-blend-difference md:block"
      aria-hidden="true"
    >
      <div className="grid-overlay absolute inset-0 opacity-[0.16] [--grid-size:11.11vw]" />

      {/* Corner crosshairs */}
      {(
        [
          ["top-6 left-6", ""],
          ["top-6 right-6", ""],
          ["bottom-6 left-6", ""],
          ["bottom-6 right-6", ""],
        ] as const
      ).map(([position], i) => (
        <div key={i} className={`absolute ${position} h-3 w-3 opacity-60`}>
          <span className="absolute top-1/2 left-0 h-px w-full bg-current" />
          <span className="absolute top-0 left-1/2 h-full w-px bg-current" />
        </div>
      ))}

      <div className="eyebrow absolute bottom-6 left-6 flex gap-6 opacity-55">
        <span>
          X {String(coords.x).padStart(4, "0")} · Y{" "}
          {String(coords.y).padStart(4, "0")}
        </span>
      </div>

      <div className="eyebrow absolute right-6 bottom-6 opacity-55">
        DEPTH {depth.toFixed(1)}%
      </div>
    </div>
  );
}
