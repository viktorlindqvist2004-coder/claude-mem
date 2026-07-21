import { useEffect, useState } from "react";

/**
 * Enkel hash-baserad routing som fungerar direkt på GitHub Pages (utan
 * server-konfiguration för djuplänkar).
 *
 * - Dedikerade sidor prefixas med "#/" (t.ex. "#/om-oss").
 * - Vanliga "#sektion"-hash (t.ex. "#bostader") tolkas som scroll-ankare
 *   på startsidan.
 */
export type Route = { page: "home"; anchor?: string } | { page: "om-oss" };

function parse(hash: string): Route {
  if (hash === "#/om-oss") return { page: "om-oss" };
  const anchor =
    hash.startsWith("#") && !hash.startsWith("#/") ? hash.slice(1) : undefined;
  return { page: "home", anchor: anchor || undefined };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parse(typeof window !== "undefined" ? window.location.hash : "")
  );

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
