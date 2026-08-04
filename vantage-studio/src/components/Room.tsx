import { useMemo, type ReactNode } from 'react'
import { Layer } from './Stage'
import { Z } from '../lib/scene'
import { seeded } from '../lib/math'

/* ── Vägg ─────────────────────────────────────────────────────────────── */

function Wall() {
  return (
    <>
      <div className="wall">
        <div className="wall__daylight" />
        <div className="wall__spill" />
      </div>
      <div className="room__vignette" />
    </>
  )
}

/* ── Fönster ──────────────────────────────────────────────────────────── */

function Window() {
  return (
    <div className="window">
      <div className="window__mullion window__mullion--v" />
      <div className="window__mullion window__mullion--h" />
    </div>
  )
}

/* ── En inramad print på väggen ───────────────────────────────────────── */

function Print() {
  return (
    <div className="print">
      <div className="print__mat">
        <svg viewBox="0 0 100 130" width="100%" height="100%" aria-hidden="true">
          <circle cx="50" cy="58" r="26" fill="none" stroke="#4a4a50" strokeWidth="1.5" />
          <path d="M24 104h52" stroke="#3c3c42" strokeWidth="2" />
        </svg>
      </div>
    </div>
  )
}

/* ── Hylla ────────────────────────────────────────────────────────────── */

function Shelf() {
  const books = useMemo(() => {
    const rnd = seeded(90210)
    // Dämpade, närliggande toner — hyllan ska läsas som en textur, inte som
    // ett färgprov.
    const palette = ['#4a453d', '#3a3a3e', '#524a40', '#3f4448', '#463e39']
    return Array.from({ length: 9 }, () => ({
      height: `${62 + rnd() * 38}%`,
      color: palette[Math.floor(rnd() * palette.length)],
      grow: 0.7 + rnd() * 0.7,
    }))
  }, [])

  return (
    <>
      <div className="books">
        {books.map((b, i) => (
          <span
            key={i}
            className="book"
            style={{ height: b.height, background: b.color, flexGrow: b.grow }}
          />
        ))}
      </div>
      <div className="shelf" />
    </>
  )
}

/* ── Växt ─────────────────────────────────────────────────────────────── */

function Plant() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', left: '81%', top: '0%', width: '13%', height: '44%' }}
      aria-hidden="true"
    >
      <g stroke="#3b463c" strokeWidth="0.9" fill="none">
        <path d="M50 6c-4 16 3 28-6 44S32 84 36 96" />
        <path d="M52 8c6 14 1 27 8 40s6 26 2 40" />
        <path d="M48 8c-7 12-9 24-3 36s3 22-2 32" />
      </g>
      {[
        [43, 24], [58, 32], [39, 44], [60, 52], [44, 62],
        [57, 72], [41, 80], [56, 90],
      ].map(([x, y], i) => (
        <ellipse
          key={i}
          cx={x} cy={y} rx="5.5" ry="3"
          fill={i % 2 ? '#41503f' : '#36432f'}
          transform={`rotate(${i % 2 ? 20 : -20} ${x} ${y})`}
        />
      ))}
      <path d="M41 2h18l-2.5 9H43.5z" fill="#4a443c" />
    </svg>
  )
}

/* ── Bildskärmen ──────────────────────────────────────────────────────── */

function Monitor({ screen }: { screen: ReactNode }) {
  return (
    <>
      {/* Skenet ligger bakom skärmen — annars färgar det innehållet. */}
      <div className="monitor__halo" />
      <div className="monitor" />
      <div className="monitor__stand" />
      <div className="monitor__foot" />
      <div className="screen">{screen}</div>
    </>
  )
}

/* ── Skrivbord ────────────────────────────────────────────────────────── */

function Desk() {
  return (
    <div className="desk">
      <div className="desk__top" />
      <div className="desk__sheen" />
      <div className="desk__edge" />
      <div className="desk__front" />
    </div>
  )
}

function Props() {
  return (
    <>
      <div className="keyboard">
        {[14, 14, 13, 11].map((count, row) => (
          <div key={row} className="keyboard__row">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="keyboard__key" />
            ))}
          </div>
        ))}
      </div>

      {/* Ett tunt pappersark — allt annat på skrivbordet skulle bara bli
          fläckar i den här skalan. */}
      <div
        className="paper"
        style={{ left: '35.5%', top: '60.4%', width: '6.5%', height: '3.6%', transform: 'rotate(-4deg)' }}
      />
    </>
  )
}

/* ── Ljus och inramning ───────────────────────────────────────────────── */

const Lamp = () => <div className="lamp-pool" />

function Foreground() {
  return (
    <>
      <div className="fg-edge" style={{ left: '-16%', top: '58%', width: '38%', height: '70%' }} />
      <div className="fg-edge" style={{ left: '80%', top: '54%', width: '40%', height: '74%' }} />
    </>
  )
}

/* ── Hela rummet ──────────────────────────────────────────────────────── */

export function Room({ screen }: { screen: ReactNode }) {
  return (
    <div className="camera-inner">
      <Layer z={Z.wall} parallax={0.25}><Wall /></Layer>
      <Layer z={Z.window} parallax={0.35}><Window /></Layer>
      <Layer z={Z.posters} parallax={0.45}><Print /></Layer>
      <Layer z={Z.shelf} parallax={0.5}><Shelf /></Layer>
      <Layer z={Z.plant} parallax={0.6}><Plant /></Layer>

      <Layer z={Z.monitor} className="layer--monitor" parallax={0.7}>
        <Monitor screen={screen} />
      </Layer>

      <Layer z={Z.desk} parallax={0.85}><Desk /></Layer>
      <Layer z={Z.props} parallax={0.95}><Props /></Layer>
      <Layer z={Z.lamp} parallax={1.05}><Lamp /></Layer>
      <Layer z={Z.foreground} className="layer--near" parallax={1.4}><Foreground /></Layer>
    </div>
  )
}
