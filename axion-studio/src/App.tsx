import { useEffect } from "react";
import Home from "./pages/Home";
import AboutPage from "./pages/AboutPage";
import ApartmentsPage from "./pages/ApartmentsPage";
import SideBrand from "./components/SideBrand";
import { useHashRoute } from "./hooks/useHashRoute";

export default function App() {
  const route = useHashRoute();

  useEffect(() => {
    if (route.page === "home") {
      // Startsidan: scrolla till rätt sektion (även efter byte från annan sida).
      if (route.anchor) document.getElementById(route.anchor)?.scrollIntoView();
    } else {
      // Dedikerad sida: börja alltid högst upp.
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [route]);

  // Scroll-reveal: tona in alla .reveal-element när de kommer i vy. Körs om
  // vid sidbyte så den nya sidans element också observeras.
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal:not(.reveal-in)")
    );
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      els.forEach((el) => el.classList.add("reveal-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [route]);

  // key per sida => sidan monteras om vid byte och spelar upp fade-in-animationen.
  // Ankarbyten inom startsidan behåller samma key och triggar därför ingen animation.
  return (
    <>
      <SideBrand key={`brand-${route.page}`} />
      <div key={route.page} className="page-enter">
        {route.page === "om-oss" ? (
          <AboutPage />
        ) : route.page === "lagenheter" ? (
          <ApartmentsPage />
        ) : (
          <Home />
        )}
      </div>
    </>
  );
}
