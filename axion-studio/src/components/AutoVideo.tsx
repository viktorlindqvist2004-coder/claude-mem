import { useEffect, useRef } from "react";

/**
 * Video som spelas upp automatiskt, i loop och tyst – utan kontroller och
 * utan interaktion (ingen tidslinje, ingen paus). Muten sätts även via ref
 * för att autoplay säkert ska tillåtas i webbläsare.
 */
export default function AutoVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {
      /* autoplay kan blockeras innan interaktion – ignoreras tyst */
    });
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      tabIndex={-1}
      aria-hidden="true"
      className={`pointer-events-none ${className ?? ""}`}
    />
  );
}
