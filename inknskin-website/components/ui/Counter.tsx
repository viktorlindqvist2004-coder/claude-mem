"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Counts from 0 to `to` the first time it scrolls into view. */
export default function Counter({
  to,
  decimals = 0,
  duration = 1.8,
  suffix = "",
  className = "",
}: {
  to: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={className}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
