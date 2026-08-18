/**
 * The film's chapters.
 *
 * The whole story is one continuous shot sequence; the copy is laid over it at
 * scroll positions rather than living in sections of its own. `at`/`until` are
 * fractions of the film's total scroll span, so a chapter is pinned to a moment
 * in the footage — not to a block of page.
 *
 * Chapters sit *inside* a shot, never across a join. The joins are where the
 * footage does its work (cloth becomes ribbon, pear opens onto sky) and copy on
 * top of them would compete with the one thing the reader should be watching.
 */
export type FilmChapter = {
  /** Fraction of the film where the chapter starts fading in. */
  at: number;
  /** Fraction where it has finished fading out. */
  until: number;
  label: string;
  heading: string;
  body: string;
  /** Which side of the frame the copy sits on. */
  align: "left" | "right";
};

/**
 * Four shots, so each occupies a quarter of the scroll. Chapters are inset
 * within their quarter to leave the transitions clear.
 */
export const FILM_CHAPTERS: FilmChapter[] = [
  {
    at: 0.0,
    until: 0.19,
    label: "Pear · Seed stage",
    heading: "Plant early. Tend patiently.",
    body: "We back founders at the very beginning — and stay in the orchard until the fruit sets.",
    align: "left",
  },
  {
    at: 0.28,
    until: 0.46,
    label: "01 / Rootstock",
    heading: "We join early",
    body: "A graft only takes where the cut faces meet exactly. We come in at that seam — early enough to matter, close enough that our work shows up in yours, and never so heavy that the join is what you feel.",
    align: "left",
  },
  {
    at: 0.53,
    until: 0.71,
    label: "02 / Season",
    heading: "We measure out loud",
    body: "You will hear what we actually think, on a schedule, in writing. Praise that is not load-bearing helps nobody, and a hard read delivered in month four is worth more than a kind one in month ten.",
    align: "right",
  },
  {
    at: 0.78,
    until: 0.97,
    label: "03 / Harvest",
    heading: "We eat what we grow",
    body: "Our return arrives the same way yours does and no sooner. That is the whole alignment: if the orchard has a bad year, so do we, and nothing in the paperwork lets us step around it.",
    align: "left",
  },
];

/**
 * Scroll distance the film occupies, in viewport heights.
 *
 * Tied to frame count rather than fixed: a longer film needs more scroll to
 * play at the same rate, and pinning the rate is what keeps the whole thing
 * feeling like one continuous move instead of four shots at four speeds.
 */
export function filmHeightVh(frameCount: number): number {
  return Math.min(900, Math.max(400, Math.round(frameCount * 2.2)));
}
