"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenis, prefersReducedMotion } from "@/lib/scroll";

/**
 * Wires Lenis to GSAP.
 *
 * Both libraries want to own a rAF loop. Running two of them de-synchronises
 * scroll position from the animations that read it, which shows up as a
 * one-frame jitter on every scrub. The fix is to give GSAP's ticker sole
 * ownership of the frame and drive Lenis from it, then let Lenis push its
 * scroll position into ScrollTrigger.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (prefersReducedMotion()) {
      // Native scrolling only; ScrollTrigger still drives the reveals, which
      // the stylesheet has already reduced to instant.
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      // Touch devices already have momentum scrolling; smoothing it again
      // makes the page feel detached from the finger.
      syncTouch: false,
      touchMultiplier: 1.6,
      wheelMultiplier: 1,
    });

    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Fonts and images settling can change section heights under ScrollTrigger.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const refreshTimer = window.setTimeout(refresh, 300);

    return () => {
      window.removeEventListener("load", refresh);
      window.clearTimeout(refreshTimer);
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return <>{children}</>;
}
