"use client";

import { useState, type ReactNode } from "react";

/**
 * A decorative artwork slot.
 *
 * Renders the photograph at `src` when it exists and quietly falls back to the
 * drawn `fallback` when it does not — same contract as the story scenes, so
 * the page is complete before any artwork is dropped in and upgrades itself
 * once it is.
 */
export default function ArtDecor({
  src,
  className = "",
  fallback,
}: {
  /** null when no artwork is present for this slot. */
  src: string | null;
  className?: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
