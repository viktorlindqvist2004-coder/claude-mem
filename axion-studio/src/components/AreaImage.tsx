import { useState } from "react";

/**
 * Bild med mjuk gradient-fallback. Om källan inte kan laddas visas en
 * varm platshållare i stället för en trasig bild-ikon.
 */
export default function AreaImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#F26522]/15 via-[#EFEFEF] to-[#E8704E]/20 ${className ?? ""}`}
        role="img"
        aria-label={alt}
      >
        <span className="px-4 text-center text-[13px] font-medium text-gray-500">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
