"use client";

import { motion, useMotionValue, useAnimationFrame, useScroll, useVelocity, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * Infinite marquee whose speed — and direction — bend with scroll velocity.
 * Scroll down and the band accelerates; scroll up and it reverses. Two copies
 * of the content are rendered and the track wraps at exactly one copy width.
 */
export default function Marquee({
  children,
  baseSpeed = 60,
  direction = 1,
  className = "",
}: {
  children: ReactNode;
  /** Pixels per second at rest. */
  baseSpeed?: number;
  direction?: 1 | -1;
  className?: string;
}) {
  const x = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  // Map raw scroll velocity to a bounded multiplier so fast flicks don't blur.
  const velocityFactor = useTransform(smoothVelocity, [-2500, 0, 2500], [-4, 1, 4], {
    clamp: true,
  });

  useAnimationFrame((_, delta) => {
    const copy = copyRef.current;
    if (!copy) return;
    const width = copy.offsetWidth;
    if (!width) return;

    const factor = velocityFactor.get();
    const moveBy = direction * baseSpeed * factor * (delta / 1000);

    let next = x.get() + moveBy;
    // Wrap into [-width, 0] so the seam is never visible.
    if (next <= -width) next += width;
    if (next > 0) next -= width;
    x.set(next);
  });

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <motion.div ref={trackRef} className="marquee-track" style={{ x }}>
        <div ref={copyRef} className="flex shrink-0">
          {children}
        </div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
