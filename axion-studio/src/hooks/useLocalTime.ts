import { useEffect, useState } from "react";

/** Returnerar aktuell tid i Brålanda som HH:MM, uppdateras varje sekund. */
export function useLocalTime() {
  const [time, setTime] = useState(() => formatTime());

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function formatTime() {
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Stockholm",
  }).format(new Date());
}
