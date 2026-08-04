import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useCamera, cameraProgress } from './Stage'
import { useFrame } from '../lib/hooks'
import { planeScale } from '../lib/scene'
import { mapRange } from '../lib/math'
import { PHOTO, type PhotoScreen } from '../data/scene-photo'

const photoUrl = `${import.meta.env.BASE_URL}${PHOTO.src}`

/**
 * Skrivbordet — ett riktigt fotografi, lätt oskarpt, med webbplatsen liggande
 * i bildskärmen. Hela scenen är ett enda plan som skalas kring skärmens
 * mittpunkt, så att kameran ser ut att åka rakt in i skärmen.
 */
export function Scene({ screen }: { screen: ReactNode }) {
  const cam = useCamera()
  const stageRef = useRef<HTMLDivElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const softRef = useRef<HTMLImageElement>(null)
  const [missing, setMissing] = useState(false)

  useFrame((f) => {
    const u = cameraProgress(f.act1, f.act3)
    // Lätt andning i vila så att bilden aldrig står helt stilla.
    const breath = f.reduced ? 0 : Math.sin(f.time * 0.00042) * 0.006 * (1 - u)
    const m = planeScale(cam.zMax * u + breath)

    if (stageRef.current) {
      stageRef.current.style.transform =
        `translate(-50%, -50%) scale(${m.toFixed(4)})`
    }

    // Skärpedjupet minskar när kameran närmar sig — som en riktig kamera som
    // ställer om fokus från rummet till skärmen.
    if (softRef.current) {
      softRef.current.style.opacity = mapRange(u, 0, 0.7).toFixed(3)
    }

    // Så fort skärmytan täcker fönstret behövs inte fotot längre. Att ta bort
    // det ur renderingen håller kompositorn nere på ett fåtal lager.
    if (plateRef.current) {
      const covered = m * cam.screenW >= f.vw && m * cam.screenH >= f.vh
      plateRef.current.style.visibility = covered ? 'hidden' : 'visible'
    }
  })

  return (
    <div
      className="stage"
      ref={stageRef}
      style={{
        transformOrigin: `${cam.originX}px ${cam.originY}px`,
        aspectRatio: String(PHOTO.aspect),
        ['--photo-aspect' as string]: String(PHOTO.aspect),
      }}
    >
      <div className={`plate ${missing ? 'plate--missing' : ''}`} ref={plateRef}>
        {!missing && (
          <>
            <img
              className="plate__img"
              src={photoUrl}
              alt=""
              aria-hidden="true"
              decoding="async"
              onError={() => setMissing(true)}
              style={{ filter: `blur(${PHOTO.blur}px)` }}
            />
            {/* Samma bild en gång till, kraftigare oskärpa. Tonas in när
                kameran närmar sig — billigare än att animera blur. */}
            <img
              className="plate__img plate__img--soft"
              ref={softRef}
              src={photoUrl}
              alt=""
              aria-hidden="true"
              decoding="async"
              style={{ filter: `blur(${PHOTO.blurNear}px)` }}
            />
          </>
        )}
        <div className="plate__dim" style={{ opacity: PHOTO.dim }} />
        <div className="plate__vignette" />
      </div>

      <div
        className="screen"
        style={{
          left: `${PHOTO.screen.x * 100}%`,
          top: `${PHOTO.screen.y * 100}%`,
          width: `${PHOTO.screen.w * 100}%`,
          height: `${PHOTO.screen.h * 100}%`,
        }}
      >
        {screen}
      </div>

      <Calibrator />
    </div>
  )
}

/* ── Inpassning av skärmytan ─────────────────────────────────────────────
   Öppna sidan med `?calibrate` för att flytta och storleksändra ramen med
   piltangenterna. Siffrorna klistras sedan in i src/data/scene-photo.ts. */

function Calibrator() {
  const [on, setOn] = useState(false)
  const [rect, setRect] = useState<PhotoScreen>({ ...PHOTO.screen })

  useEffect(() => {
    setOn(new URLSearchParams(window.location.search).has('calibrate'))
  }, [])

  useEffect(() => {
    if (!on) return
    const onKey = (e: KeyboardEvent) => {
      const step = e.altKey ? 0.0005 : 0.005
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
      if (!d) return
      e.preventDefault()
      setRect((r) =>
        e.shiftKey
          ? { ...r, w: Math.max(0.01, r.w + d[0] * step), h: Math.max(0.01, r.h + d[1] * step) }
          : { ...r, x: r.x + d[0] * step, y: r.y + d[1] * step },
      )
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [on])

  if (!on) return null

  const n = (v: number) => Number(v.toFixed(4))

  return (
    <>
      <div
        className="calib__box"
        style={{
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.w * 100}%`,
          height: `${rect.h * 100}%`,
        }}
      />
      {/* Panelen får inte skalas med scenen, så den ritas utanför den. */}
      {createPortal(
        <div className="calib__panel">
          <strong>Inpassning av skärmyta</strong>
          <span>Piltangenter flyttar · Skift ändrar storlek · Alt = finjustering</span>
          <code>
            screen: {'{'} x: {n(rect.x)}, y: {n(rect.y)}, w: {n(rect.w)}, h: {n(rect.h)} {'}'}
          </code>
          <span>Klistra in raden i src/data/scene-photo.ts</span>
        </div>,
        document.body,
      )}
    </>
  )
}
