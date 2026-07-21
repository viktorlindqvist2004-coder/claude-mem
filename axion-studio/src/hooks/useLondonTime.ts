import { useEffect, useState } from "react";

/** Returns the current London time as an HH:MM string, updated every second. */
export function useLondonTime() {
  const [time, setTime] = useState(() => formatLondon());

  useEffect(() => {
    const id = setInterval(() => setTime(formatLondon()), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function formatLondon() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(new Date());
}
