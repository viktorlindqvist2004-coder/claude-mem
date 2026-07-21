import { useEffect } from "react";
import Home from "./pages/Home";
import AboutPage from "./pages/AboutPage";
import ApartmentsPage from "./pages/ApartmentsPage";
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

  // key per sida => sidan monteras om vid byte och spelar upp fade-in-animationen.
  // Ankarbyten inom startsidan behåller samma key och triggar därför ingen animation.
  return (
    <div key={route.page} className="page-enter">
      {route.page === "om-oss" ? (
        <AboutPage />
      ) : route.page === "lagenheter" ? (
        <ApartmentsPage />
      ) : (
        <Home />
      )}
    </div>
  );
}
