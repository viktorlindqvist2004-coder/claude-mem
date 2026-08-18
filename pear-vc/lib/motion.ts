/**
 * Motion tokens.
 *
 * One signature curve and three durations, so the page has a single motion
 * identity rather than five curves and seven durations that happened to be
 * typed at different times.
 *
 * The curve is a decelerating cubic: fast departure, gentle landing. It suits
 * entrances, which is most of what this page does, and it never overshoots —
 * overshoot would undercut the composed, unhurried character the rest of the
 * design commits to.
 */

/** GSAP name and its CSS equivalent. Keep these two in step. */
export const EASE = "power3.out";
export const EASE_CSS = "cubic-bezier(0.33, 1, 0.68, 1)";

/**
 * Seconds, for GSAP. `quick` is interface feedback, `base` is the workhorse,
 * `slow` is reserved for content arriving for the first time.
 */
export const DURATION = {
  quick: 0.18,
  base: 0.42,
  slow: 0.72,
} as const;

/**
 * Line stagger for split headings. Total stagger has to stay well under half a
 * second or the last line reads as a separate event rather than part of the
 * same sentence.
 */
export const STAGGER = {
  tight: 0.05,
  line: 0.08,
} as const;
