"use client";

import { motion, type Variants } from "motion/react";
import type { ElementType, ReactNode } from "react";

type Custom = { stagger: number; delay: number };

const container: Variants = {
  hidden: {},
  show: ({ stagger, delay }: Custom) => ({
    transition: { staggerChildren: stagger, delayChildren: delay },
  }),
};

const item: Variants = {
  hidden: { y: "110%", rotate: 3 },
  show: {
    y: "0%",
    rotate: 0,
    transition: { duration: 1.05, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * IMPORTANT: the masked child is translated fully outside its own
 * `overflow-hidden` box, so an IntersectionObserver placed on the child would
 * measure a zero-size intersection and never fire. Every reveal here therefore
 * observes the *unclipped* wrapper and drives the masked child through
 * variants.
 */

type Props = {
  children: string;
  as?: ElementType;
  className?: string;
  /** Seconds between each word. */
  stagger?: number;
  /** How far into the viewport before it fires. */
  amount?: number;
  once?: boolean;
  delay?: number;
};

/** Word-by-word mask reveal — the classic editorial type entrance. */
export default function SplitText({
  children,
  as: Tag = "span",
  className = "",
  stagger = 0.055,
  amount = 0.4,
  once = true,
  delay = 0,
}: Props) {
  const words = children.split(" ");
  const MotionTag = motion.create(Tag as ElementType);

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={container}
      custom={{ stagger, delay } satisfies Custom}
    >
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="inline-block overflow-hidden align-bottom pb-[0.14em] -mb-[0.14em]"
        >
          <motion.span variants={item} className="inline-block will-change-transform">
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

const maskChild: Variants = {
  hidden: { y: "110%" },
  show: (delay: number) => ({
    y: "0%",
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1], delay },
  }),
};

/** Same reveal, but for arbitrary content instead of a string. */
export function MaskUp({
  children,
  className = "",
  delay = 0,
  amount = 0.3,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  return (
    <motion.span
      className={`block overflow-hidden ${className}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      custom={delay}
    >
      <motion.span variants={maskChild} className="block will-change-transform">
        {children}
      </motion.span>
    </motion.span>
  );
}
