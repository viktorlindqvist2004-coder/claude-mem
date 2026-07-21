import { useEffect } from "react";
import Hero from "./components/Hero";
import About from "./components/About";
import CaseStudies from "./components/CaseStudies";
import Contact from "./components/Contact";
import AboutPage from "./pages/AboutPage";
import { useHashRoute } from "./hooks/useHashRoute";

export default function App() {
  const route = useHashRoute();

  useEffect(() => {
    if (route.page === "om-oss") {
      // Dedikerad sida: börja alltid högst upp.
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    } else if (route.anchor) {
      // Startsidan: scrolla till rätt sektion (även efter byte från annan sida).
      document.getElementById(route.anchor)?.scrollIntoView();
    }
  }, [route]);

  if (route.page === "om-oss") return <AboutPage />;

  return (
    <main>
      <Hero />
      <About />
      <CaseStudies />
      <Contact />
    </main>
  );
}
