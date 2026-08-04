import { useRef } from 'react'
import { useCamera, cameraProgress } from './Stage'
import { useFrame, useMeasuredHeight, useViewport } from '../lib/hooks'
import { clamp01, easeOutCubic, lerp, mapRange } from '../lib/math'
import { MARQUEE_WORDS } from '../data/content'
import { Marquee } from './inner/Marquee'
import { About, Hero, Manifest, Numbers, Outro, Services } from './inner/Sections'
import { Work } from './inner/Work'
import { Process } from './inner/Process'
import { Showcase } from './inner/Showcase'
import { Contact } from './Plates'

/**
 * Innehållet på bildskärmen.
 *
 * Ytan ritas i fönstrets fulla storlek och skalas ned med 1/kameraskala. När
 * kameran åkt hela vägen in tar de två skalorna ut varandra och sidan ligger i
 * exakt 1:1 — texten är då lika skarp som på vilken vanlig sida som helst.
 */
export function ScreenContent({
  onHeight,
  reduced = false,
}: {
  onHeight: (h: number) => void
  reduced?: boolean
}) {
  const cam = useCamera()
  const { vw, vh } = useViewport()

  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const wakeRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const crtRef = useRef<HTMLDivElement>(null)

  useMeasuredHeight(scrollRef, onHeight)

  useFrame((f) => {
    if (scrollRef.current) {
      scrollRef.current.style.transform = `translate3d(0, ${(-f.inner).toFixed(1)}px, 0)`
    }

    const u = cameraProgress(f.act1, f.act3)

    // Fyller skärmytan på håll, landar i exakt 1:1 när vi är inne.
    if (rootRef.current) {
      const k = lerp(cam.contentCover, cam.contentExact, easeOutCubic(u))
      rootRef.current.style.transform = `translate(-50%, -50%) scale(${k.toFixed(5)})`
    }

    // Vinjetten hör hemma på avstånd; väl inne ska bilden vara ren.
    if (crtRef.current) {
      crtRef.current.style.setProperty('--crt', (1 - mapRange(u, 0.68, 0.98)).toFixed(3))
    }

    // Skärmen vaknar lugnt medan kameran närmar sig, och somnar om först när
    // vi nästan är ute igen. Vore tröskeln symmetrisk skulle vilolägets
    // ordmärke lägga sig över texten mitt i utzoomningen.
    const wake = wakeRef.current
    if (wake) {
      const fade = clamp01(
        (1 - mapRange(f.act1, 0.34, 0.62)) + mapRange(f.act3, 0.8, 1),
      )
      wake.style.opacity = fade.toFixed(3)
      wake.style.visibility = fade <= 0.01 ? 'hidden' : 'visible'
    }
    if (barRef.current) {
      barRef.current.style.width = `${(mapRange(f.act1, 0.06, 0.34) * 100).toFixed(1)}%`
    }
  })

  return (
    <div
      className="screen-content"
      ref={rootRef}
      style={{ width: vw, height: vh }}
    >
      <div className="screen-scroll" ref={scrollRef}>
        <Hero />
        <Marquee words={MARQUEE_WORDS} />
        <Manifest />
        <Showcase
          src="images/showcase-01.jpg"
          kicker="Så här jobbar vi"
          caption="Varje projekt börjar med ett tomt ark."
        />
        <Work />
        <Marquee words={['Vantage Design Studio', 'Grundad 2026', 'Handkodat', 'Inga mallar']} direction={-1} speed={0.03} />
        <Services />
        <Process />
        <Showcase
          src="images/showcase-02.jpg"
          kicker="Identitet"
          caption="Formen ska bära varumärket hela vägen ut."
          length={2}
          zoom={0.36}
        />
        <Numbers />
        <About />
        {reduced ? <Contact variant="static" /> : <Outro />}
      </div>

      {!reduced && (
        <>
          <div className="wake" ref={wakeRef} aria-hidden="true">
            <span className="wake__mark">Vantage Design Studio</span>
            <div className="wake__bar">
              <span ref={barRef} />
            </div>
          </div>

          <div className="crt" ref={crtRef} aria-hidden="true" />
        </>
      )}
    </div>
  )
}
