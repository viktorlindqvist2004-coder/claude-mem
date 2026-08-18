"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { prefersReducedMotion } from "@/lib/scroll";
import { DURATION, EASE, STAGGER } from "@/lib/motion";

type RevealTextProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Extra delay before the first line moves. */
  delay?: number;
  stagger?: number;
  /** ScrollTrigger start, e.g. "top 80%". */
  start?: string;
};

/**
 * Line-by-line blur/slide reveal driven by ScrollTrigger.
 *
 * SplitText handles the line breaking so the animation survives reflow at any
 * viewport width. If it is unavailable the whole block still animates in — the
 * copy is never left invisible.
 */
export default function RevealText({
  as: Tag = "p",
  children,
  className = "",
  delay = 0,
  stagger = STAGGER.line,
  start = "top 82%",
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    gsap.registerPlugin(ScrollTrigger, SplitText);

    if (prefersReducedMotion()) {
      gsap.set(element, { opacity: 1, filter: "none", y: 0 });
      return;
    }

    const context = gsap.context(() => {
      let split: SplitText | null = null;
      let targets: Element[] = [element];

      try {
        split = new SplitText(element, {
          type: "lines",
          linesClass: "reveal-split-line",
        });
        if (split.lines.length) targets = split.lines;
      } catch {
        split = null;
      }

      gsap.set(element, { opacity: 1, filter: "none" });
      gsap.set(targets, {
        opacity: 0,
        yPercent: 60,
        filter: "blur(10px)",
        willChange: "transform, opacity, filter",
      });

      gsap.to(targets, {
        opacity: 1,
        yPercent: 0,
        filter: "blur(0px)",
        duration: DURATION.slow,
        ease: EASE,
        stagger,
        delay,
        clearProps: "willChange",
        scrollTrigger: { trigger: element, start, once: true },
      });

      return () => split?.revert();
    }, ref);

    return () => context.revert();
  }, [delay, stagger, start]);

  return (
    <Tag ref={ref} className={`reveal-line ${className}`}>
      {children}
    </Tag>
  );
}
