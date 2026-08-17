import Navbar from "@/components/Navbar";
import StoryCanvas from "@/components/StoryCanvas";
import HudOverlay from "@/components/HudOverlay";
import Story from "@/components/Story";
import Faq from "@/components/Faq";
import Constellations from "@/components/Constellations";
import Footer from "@/components/Footer";

/**
 * Page composition.
 *
 * StoryCanvas is fixed behind everything and renders scenes 0–4 as the reader
 * scrolls through `#story`. Once the story ends it fades out and the remaining
 * sections carry their own backgrounds.
 */
export default function Home() {
  return (
    <>
      <Navbar />
      <StoryCanvas />
      <HudOverlay />

      <main>
        <Story />
        <Faq />
        <Constellations />
        <Footer />
      </main>
    </>
  );
}
