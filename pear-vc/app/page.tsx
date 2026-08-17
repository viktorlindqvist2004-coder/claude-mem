import Navbar from "@/components/Navbar";
import StoryCanvas from "@/components/StoryCanvas";
import HudOverlay from "@/components/HudOverlay";
import Story from "@/components/Story";
import Faq from "@/components/Faq";
import Constellations from "@/components/Constellations";
import Footer from "@/components/Footer";
import SequenceSection from "@/components/SequenceSection";
import { resolveSceneArt } from "@/lib/sceneAssets";
import { resolveSequence } from "@/lib/sequenceAssets";
import { STORY_ART_SLOTS } from "@/lib/scenes";

/**
 * Page composition.
 *
 * StoryCanvas is fixed behind everything and renders scenes 0–4 as the reader
 * scrolls through `#story`. Once the story ends the remaining sections carry
 * their own opaque backgrounds and simply scroll over it.
 *
 * Which scene artwork exists is resolved here, on the server, so the client
 * only ever requests files that are actually there.
 */
export default function Home() {
  const art = resolveSceneArt();
  const sceneImages = STORY_ART_SLOTS.map((slot) => art[slot]);
  // Empty until frames are exported; the section removes itself when so.
  const cutSequence = resolveSequence("cut");

  return (
    <>
      <Navbar />
      <StoryCanvas sceneImages={sceneImages} />
      <HudOverlay />

      <main>
        <Story />
        <SequenceSection frames={cutSequence} />
        <Faq artwork={art["06-orchard-pale"]} />
        <Constellations artwork={art["07-night-tending"]} />
        <Footer />
      </main>
    </>
  );
}
