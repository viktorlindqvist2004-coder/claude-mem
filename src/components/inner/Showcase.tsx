import { useRef, useState } from 'react'
import { useFrame } from '../../lib/hooks'
import { useTrack } from '../../lib/track'
import { easeOutCubic, mapRange } from '../../lib/math'

/**
 * Helskärmsbild som nålas fast och zoomas in medan man scrollar förbi den.
 * Bilden fortsätter alltså röra sig långt efter att den fyllt rutan, vilket
 * ger sidan samma kamerakänsla inuti skärmen som utanför.
 */
export function Showcase({
  src,
  kicker,
  caption,
  /** Sektionens höjd i fönsterhöjder — längre = långsammare zoom. */
  length = 2.2,
  /** Hur mycket bilden växer över sträckan. */
  zoom = 0.42,
}: {
  src: string
  kicker: string
  caption: string
  length?: number
  zoom?: number
}) {
  const secRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const capRef = useRef<HTMLDivElement>(null)
  const track = useTrack(secRef)
  const [missing, setMissing] = useState(false)

  useFrame((f) => {
    const t = track(f)

    if (pinRef.current) {
      pinRef.current.style.transform = `translate3d(0, ${t.offset.toFixed(1)}px, 0)`
    }
    if (mediaRef.current) {
      mediaRef.current.style.transform = `scale(${(1.02 + t.pin * zoom).toFixed(4)})`
    }
    if (capRef.current) {
      // Texten kommer in tidigt och lämnar innan bilden slutat växa.
      const inn = easeOutCubic(mapRange(t.pin, 0.08, 0.3))
      const out = mapRange(t.pin, 0.72, 0.95)
      capRef.current.style.opacity = (inn * (1 - out)).toFixed(3)
      capRef.current.style.transform =
        `translate3d(0, ${((1 - inn) * 32 - out * 24).toFixed(1)}px, 0)`
    }
  })

  return (
    <section className="pin" ref={secRef} style={{ height: `${length * 100}vh` }}>
      <div className="pin__inner" ref={pinRef}>
        <div className="showcase">
          <div className={`showcase__media ${missing ? 'showcase__media--missing' : ''}`} ref={mediaRef}>
            {!missing && (
              <img
                className="showcase__img"
                src={`${import.meta.env.BASE_URL}${src}`}
                alt={caption}
                loading="lazy"
                decoding="async"
                onError={() => setMissing(true)}
              />
            )}
          </div>
          <div className="showcase__scrim" />
          <div className="showcase__cap" ref={capRef}>
            <span className="label">{kicker}</span>
            <p className="showcase__text">{caption}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
