"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Two-part cursor: a hard dot that tracks the pointer 1:1 and a lagging ring
 * that springs behind it. Anything with `data-cursor="..."` swells the ring and
 * prints its label inside. Mouse-only — never mounted on touch devices.
 */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 320, damping: 30, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 320, damping: 30, mass: 0.5 });

  useEffect(() => {
    const fine =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    setEnabled(true);

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);

      const target = (e.target as HTMLElement | null)?.closest?.(
        "[data-cursor], a, button",
      ) as HTMLElement | null;

      if (!target) {
        setActive(false);
        setLabel("");
        return;
      }
      setActive(true);
      setLabel(target.dataset?.cursor && target.dataset.cursor !== "true" ? target.dataset.cursor : "");
    };

    const onLeave = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] hidden mix-blend-difference md:block"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms" }}
    >
      <motion.div
        className="absolute left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone"
        style={{ x, y }}
      />
      <motion.div
        className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-bone/70"
        style={{ x: ringX, y: ringY }}
        animate={{
          width: active ? (label ? 96 : 58) : 34,
          height: active ? (label ? 96 : 58) : 34,
          opacity: active ? 1 : 0.55,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        {label ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[9px] font-medium uppercase tracking-[0.18em] text-bone"
          >
            {label}
          </motion.span>
        ) : null}
      </motion.div>
    </div>
  );
}
