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
      // The page is mostly one long film, so scrolling is a transport control
      // more than a way to get somewhere. A longer glide and a quintic ease
      // give it the flywheel feel that suits that: it takes a moment to get
      // going and coasts to a stop rather than tracking the wheel one-to-one.
      duration: 1.5,
      easing: (t: number) => 1 - Math.pow(1 - t, 5),
      smoothWheel: true,
      // Touch devices already have momentum scrolling; smoothing it again
      // makes the page feel detached from the finger.
      syncTouch: false,
      // Both multipliers are below 1 deliberately. A notch of wheel should
      // advance the film a little, not throw it — the frames are the content,
      // and at 1.0 a single flick skipped past most of a shot.
      touchMultiplier: 1.1,
      wheelMultiplier: 0.65,
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
