import { createContext, useContext, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { computeCamera, insideness, layerState, PERSPECTIVE, type Camera } from '../lib/scene'
import { easeInOutCubic } from '../lib/math'
import { useFrame, useViewport } from '../lib/hooks'

const CameraContext = createContext<Camera>(computeCamera(1440, 900))

export const useCamera = () => useContext(CameraContext)

export function CameraProvider({ children }: { children: ReactNode }) {
  const { vw, vh } = useViewport()
  const camera = useMemo(() => computeCamera(vw, vh), [vw, vh])
  return <CameraContext.Provider value={camera}>{children}</CameraContext.Provider>
}

/** Kamerans position längs resan: 0 i rummet, 1 inne i skärmen. */
export const cameraProgress = (act1: number, act3: number) =>
  insideness(act1, act3, easeInOutCubic)

/**
 * Ett plant lager på djupet `z`. Skalas kring skärmens mittpunkt så att hela
 * rummet öppnar sig kring bildskärmen när kameran åker framåt.
 */
export function Layer({
  z,
  className = '',
  style,
  parallax = 1,
  children,
}: {
  z: number
  className?: string
  style?: CSSProperties
  /** 0 stänger av musparallax för lagret. */
  parallax?: number
  children?: ReactNode
}) {
  const cam = useCamera()
  const ref = useRef<HTMLDivElement>(null)

  useFrame((f) => {
    const el = ref.current
    if (!el) return

    const u = cameraProgress(f.act1, f.act3)
    // Lätt andning i vila så att bilden aldrig står helt stilla.
    const breath = f.reduced ? 0 : Math.sin(f.time * 0.00042) * 0.007 * (1 - u)
    const { scale, opacity } = layerState(z, cam.zMax * u + breath)

    // Närmare lager rör sig mer med muspekaren — klassisk parallax.
    const depth = PERSPECTIVE - z
    const drift = (parallax * (1 - u) * 26) / depth
    const px = -f.pointerX * drift
    const py = -f.pointerY * drift * 0.55

    el.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
    el.style.opacity = opacity.toFixed(3)
  })

  return (
    <div
      ref={ref}
      className={`layer ${className}`}
      style={{ transformOrigin: `${cam.originX}px ${cam.originY}px`, ...style }}
    >
      {children}
    </div>
  )
}
