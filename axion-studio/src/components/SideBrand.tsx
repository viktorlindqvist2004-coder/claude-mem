import { useEffect, useState } from "react";

/**
 * Lodrät varumärkesetikett längs sidans vänsterkant (endast stora skärmar).
 * Tonar bort när den blå kontakt-sektionen kommer i vy, så den aldrig
 * krockar blått mot blått.
 */
export default function SideBrand() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("[data-footer]");
    if (!footer) return;
    const io = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { rootMargin: "0px 0px -25% 0px" }
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-40 hidden h-screen items-center pl-4 transition-opacity duration-500 lg:flex xl:pl-6 ${
        hidden ? "opacity-0" : "opacity-100"
      }`}
    >
      <span
        className="select-none text-[12px] font-semibold uppercase tracking-[0.4em] text-[#1E3A5F]"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        Sunt Förnuft
      </span>
    </div>
  );
}
