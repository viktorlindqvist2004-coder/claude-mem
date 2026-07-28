"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** Hairline at the very top of the viewport that tracks page progress. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[55] h-px origin-left bg-ember"
      style={{ scaleX }}
      aria-hidden
    />
  );
}
