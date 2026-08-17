import type Lenis from "lenis";

/**
 * Module-level handle on the single Lenis instance.
 *
 * Lenis owns the scroll position for the whole document, so anything that wants
 * to move the page (nav anchors, the "apply" button) has to go through it —
 * calling window.scrollTo would fight the smoothing and snap.
 */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null): void {
  instance = lenis;
}

export function getLenis(): Lenis | null {
  return instance;
}

export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;

  if (instance) {
    instance.scrollTo(target, { offset: 0, duration: 1.4 });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
