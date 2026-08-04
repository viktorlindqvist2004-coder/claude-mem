import { useRef } from 'react'
import { useFrame } from '../../lib/hooks'

/**
 * Ett stillsamt löpande textband. Grundfarten är låg och scrollhastigheten
 * påverkar den bara svagt — bandet ska glida, inte rycka.
 */
export function Marquee({
  words,
  speed = 0.018,
  direction = 1,
}: {
  words: string[]
  speed?: number
  direction?: 1 | -1
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const offset = useRef(0)

  useFrame((f) => {
    const track = trackRef.current
    const group = groupRef.current
    if (!track || !group) return

    const width = group.offsetWidth
    if (!width) return

    const push = f.reduced ? 0 : speed * f.dt + f.velocity * 0.16
    offset.current = (offset.current + push * direction) % width
    if (offset.current > 0) offset.current -= width

    track.style.transform = `translate3d(${offset.current.toFixed(2)}px, 0, 0)`
  })

  const group = (ref?: React.Ref<HTMLDivElement>) => (
    <div className="marquee__group" ref={ref}>
      {words.map((w) => (
        <span className="marquee__item" key={w}>
          {w}
          <i className="marquee__dot" />
        </span>
      ))}
    </div>
  )

  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track" ref={trackRef}>
        {group(groupRef)}
        {/* Kopia så att bandet aldrig tar slut. */}
        {group()}
      </div>
    </div>
  )
}
