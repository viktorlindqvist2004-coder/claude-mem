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
 * Nine shots of unequal length, so the boundaries are not ninths. Two shots
 * were trimmed to repair a join, which leaves the run:
 *
 *   1  0.000–0.120   cloth pulled across the lens
 *   2  0.120–0.240   cloth becomes the ribbon, down to the graft
 *   3  0.240–0.360   back to the tree, in on one pear
 *   4  0.360–0.445   the pear is opened
 *   5  0.445–0.520   down from the sky to the scaffold
 *   6  0.520–0.640   a craftsman steps in and raises a drawing
 *   7  0.640–0.760   the camera enters the drawing
 *   8  0.760–0.880   the paper washes back out to sky
 *   9  0.880–1.000   in on the pear until it glows
 *
 * Chapters are inset within a shot and never cross a join. Shot 7 carries no
 * copy at all: the move into the drawing is the best thing in the film and it
 * plays unaccompanied.
 */
export const FILM_CHAPTERS: FilmChapter[] = [
  {
    at: 0.005,
    until: 0.1,
    label: "Pear · Seed stage",
    heading: "Plant early. Tend patiently.",
    body: "We back founders at the very beginning — and stay in the orchard until the fruit sets.",
    align: "left",
  },
  {
    at: 0.135,
    until: 0.225,
    label: "01 / Rootstock",
    heading: "We join early",
    body: "A graft only takes where the cut faces meet exactly. We come in at that seam — early enough to matter, close enough that our work shows up in yours, and never so heavy that the join is what you feel.",
    align: "left",
  },
  {
    at: 0.255,
    until: 0.345,
    label: "02 / Season",
    heading: "We measure out loud",
    body: "You will hear what we actually think, on a schedule, in writing. Praise that is not load-bearing helps nobody, and a hard read delivered in month four is worth more than a kind one in month ten.",
    align: "right",
  },
  {
    at: 0.375,
    until: 0.435,
    label: "03 / Harvest",
    heading: "We eat what we grow",
    body: "Our return arrives the same way yours does and no sooner. That is the whole alignment: if the orchard has a bad year, so do we, and nothing in the paperwork lets us step around it.",
    align: "left",
  },
  {
    at: 0.545,
    until: 0.625,
    label: "04 / Workshop",
    heading: "We build it with you",
    body: "Money is the least of what we bring. Our people sit in your sprints, your hiring loops and your worst weeks — not to take the wheel, but because advice given from a distance is only ever a guess.",
    align: "left",
  },
  {
    at: 0.795,
    until: 0.865,
    label: "05 / Selection",
    heading: "A short list, on purpose",
    body: "We make a handful of investments a year and decline nearly everything else. That is not taste for its own sake — it is the only honest way to promise the attention described above.",
    align: "left",
  },
  {
    at: 0.905,
    until: 0.975,
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
 * feeling like one continuous move instead of nine shots at nine speeds.
 *
 * This is the coarse control over how fast the film plays — at 3.4 viewports
 * per frame a full film is a long, deliberate scroll, and each frame holds
 * long enough to be seen rather than flicking past.
 */
export function filmHeightVh(frameCount: number): number {
  return Math.min(1600, Math.max(400, Math.round(frameCount * 3.4)));
}
