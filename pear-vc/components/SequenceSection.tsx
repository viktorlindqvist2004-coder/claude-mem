"use client";

import RevealText from "./RevealText";
import SequenceScrubber from "./SequenceScrubber";

const SECTION_ID = "sequence";

/**
 * Hosts the scrubbed sequence.
 *
 * The section is several viewports tall and the canvas is sticky inside it, so
 * the shot holds still on screen while the scroll distance is spent advancing
 * frames rather than moving the page. That scroll span is what the scrubber
 * maps onto the frame range, which is why the height lives here and not in the
 * component.
 */
export default function SequenceSection({ frames }: { frames: string[] }) {
  if (frames.length === 0) return null;

  return (
    <section id={SECTION_ID} className="relative z-10 h-[320vh] bg-ink">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <SequenceScrubber
          frames={frames}
          triggerId={SECTION_ID}
          className="absolute inset-0 h-full w-full"
        />

        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/60 via-black/15 to-transparent" />

        <div className="relative flex h-full items-center px-6 md:px-14">
          <div className="mx-auto w-full max-w-[1600px]">
            <RevealText
              as="p"
              className="eyebrow mb-6 text-canvas/70"
              stagger={0}
            >
              05 / The cut
            </RevealText>
            <RevealText
              as="h2"
              className="display max-w-2xl text-[clamp(2.5rem,7vw,6.5rem)] text-canvas"
            >
              Opened in the open
            </RevealText>
            <RevealText
              as="p"
              className="mt-10 max-w-md text-lg leading-relaxed text-canvas/85 md:mt-12 md:text-xl"
              delay={0.15}
            >
              Keep scrolling. Nothing here is playing on its own — the cut moves
              at exactly the pace you move it.
            </RevealText>
          </div>
        </div>
      </div>
    </section>
  );
}
