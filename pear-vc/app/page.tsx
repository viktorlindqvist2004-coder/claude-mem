import Navbar from "@/components/Navbar";
import StoryCanvas from "@/components/StoryCanvas";
import HudOverlay from "@/components/HudOverlay";
import Story from "@/components/Story";
import FilmSequence from "@/components/FilmSequence";
import Terms from "@/components/Terms";
import Faq from "@/components/Faq";
import Constellations from "@/components/Constellations";
import Footer from "@/components/Footer";
import { resolveSceneArt } from "@/lib/sceneAssets";
import { resolveSequence } from "@/lib/sequenceAssets";
import { STORY_ART_SLOTS } from "@/lib/scenes";

/**
 * Page composition.
 *
 * The story is told one of two ways, decided here at build time by whether the
 * film's frames have been exported:
 *
 * - **With frames**, `FilmSequence` runs the whole story as a single scrubbed
 *   shot sequence and the copy is laid over it. This is the intended form: the
 *   motion lives in the footage, and the joins between shots are content
 *   rather than effects.
 * - **Without frames**, the earlier arrangement stands in — a fixed WebGL
 *   canvas moving through stills behind ordinary sections. It reads as a
 *   camera over photographs, which is the best a still can do, and it keeps
 *   the site whole while the footage is being made.
 *
 * Both paths share everything below the story, so only the telling changes.
 */
export default function Home() {
  const art = resolveSceneArt();
  const sceneImages = STORY_ART_SLOTS.map((slot) => art[slot]);
  const film = resolveSequence("film");
  // Same film at 720px, for canvases too small to justify decoding 1280px.
  const filmSmall = resolveSequence("film-sm");
  const hasFilm = film.length > 0;

  return (
    <>
      <Navbar />

      {!hasFilm && <StoryCanvas sceneImages={sceneImages} />}
      <HudOverlay />

      <main>
        {hasFilm ? (
          <>
            <FilmSequence frames={film} framesSmall={filmSmall} />
            <Terms />
          </>
        ) : (
          <Story />
        )}

        <Faq artwork={art["06-orchard-pale"]} />
        <Constellations artwork={art["07-night-tending"]} />
        <Footer />
      </main>
    </>
  );
}
