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
 * Eight shots of unequal length, so the boundaries are not eighths. Two shots
 * are trimmed to repair a join, which leaves the run:
 *
 *   1  0.000–0.136   cloth pulled across the lens
 *   2  0.136–0.273   cloth becomes the ribbon, down to the graft
 *   3  0.273–0.409   back to the tree, in on one pear
 *   4  0.409–0.506   the pear is opened
 *   5  0.506–0.591   down from the sky to the scaffold
 *   6  0.591–0.727   a craftsman steps in and raises a drawing
 *   7  0.727–0.864   into the drawing, then out of it to a figure and a sapling
 *   8  0.864–1.000   in on the pear until it glows
 *
 * Chapters are inset within a shot and never cross a join. The first half of
 * shot 7 is left clear: the camera entering the drawing is the best thing in
 * the film and it plays unaccompanied.
 */
export const FILM_CHAPTERS: FilmChapter[] = [
  {
    at: 0.005,
    until: 0.115,
    label: "Pear · Seed stage",
    heading: "Plant early. Tend patiently.",
    body: "We back founders at the very beginning — and stay in the orchard until the fruit sets.",
    align: "left",
  },
  {
    at: 0.155,
    until: 0.255,
    label: "01 / Rootstock",
    heading: "We join early",
    body: "A graft only takes where the cut faces meet exactly. We come in at that seam — early enough to matter, close enough that our work shows up in yours, and never so heavy that the join is what you feel.",
    align: "left",
  },
  {
    at: 0.29,
    until: 0.39,
    label: "02 / Season",
    heading: "We measure out loud",
    body: "You will hear what we actually think, on a schedule, in writing. Praise that is not load-bearing helps nobody, and a hard read delivered in month four is worth more than a kind one in month ten.",
    align: "right",
  },
  {
    at: 0.425,
    until: 0.49,
    label: "03 / Harvest",
    heading: "We eat what we grow",
    body: "Our return arrives the same way yours does and no sooner. That is the whole alignment: if the orchard has a bad year, so do we, and nothing in the paperwork lets us step around it.",
    align: "left",
  },
  {
    at: 0.61,
    until: 0.71,
    label: "04 / Workshop",
    heading: "We build it with you",
    body: "Money is the least of what we bring. Our people sit in your sprints, your hiring loops and your worst weeks — not to take the wheel, but because advice given from a distance is only ever a guess.",
    align: "left",
  },
  {
    at: 0.815,
    until: 0.862,
    label: "05 / Selection",
    heading: "A short list, on purpose",
    body: "We make a handful of investments a year and decline nearly everything else. That is not taste for its own sake — it is the only honest way to promise the attention described above.",
    align: "left",
  },
  {
    at: 0.9,
    until: 0.965,
    label: "",
    heading: "Start the season",
    body: "Applications are open year-round, and every one gets a real answer inside ten days.",
    align: "left",
  },
];

/**
 * Scroll distance the film occupies, in viewport heights.
 *
 * Tied to frame count rather than fixed: a longer film needs more scroll to
 * play at the same rate, and pinning the rate is what keeps the whole thing
 * feeling like one continuous move instead of eight shots at eight speeds.
 *
 * This is the coarse control over how fast the film plays — at 3.4 viewports
 * per frame a full film is a long, deliberate scroll, and each frame holds
 * long enough to be seen rather than flicking past.
 */
export function filmHeightVh(frameCount: number): number {
  return Math.min(1600, Math.max(400, Math.round(frameCount * 3.4)));
}
