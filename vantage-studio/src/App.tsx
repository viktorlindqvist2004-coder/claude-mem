import { useEffect, useRef, useState } from 'react'
import { CameraProvider, cameraProgress, useCamera } from './components/Stage'
import { Room } from './components/Room'
import { ScreenContent } from './components/ScreenContent'
import { Cursor, Hint, Nav, Progress } from './components/Overlay'
import { Contact, Preloader, TitlePlate } from './components/Plates'
import { useFrame, usePrefersReducedMotion, useViewport } from './lib/hooks'
import { setMetrics, start, stop } from './lib/scroll'

/** Scrollsträcka för in- respektive utzoomningen, i fönsterhöjder. */
const ACT1_VH = 4.6
const ACT3_VH = 3

export default function App() {
  return (
    <CameraProvider>
      <Experience />
    </CameraProvider>
  )
}

function Experience() {
  const { vh } = useViewport()
  const cam = useCamera()
  const reduced = usePrefersReducedMotion()

  const [contentHeight, setContentHeight] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [showPreloader, setShowPreloader] = useState(true)

  const viewportRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)

  // Utan akt 1 och 3 startar sidan direkt inne i skärmen och blir en helt
  // vanlig sida — ingen kamerarörelse alls.
  const act1 = reduced ? 0 : vh * ACT1_VH
  const act3 = reduced ? 0 : vh * ACT3_VH
  const innerMax = Math.max(contentHeight - vh, 0)

  // Sidans höjd är summan av de tre akterna — det är den enda scrollytan.
  const total = act1 + innerMax + act3 + vh

  useEffect(() => {
    setMetrics({ act1, act3, innerMax })
  }, [act1, act3, innerMax])

  useEffect(() => {
    // Börja alltid vid rummet, även efter en omladdning mitt i sidan.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    start()
    return () => stop()
  }, [])

  useEffect(() => {
    let cancelled = false
    const ready = () => {
      if (cancelled) return
      setLoaded(true)
      // Låt draperiet åka upp innan det plockas bort ur DOM:en.
      window.setTimeout(() => !cancelled && setShowPreloader(false), 1200)
    }
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    const wait = fonts?.ready ?? Promise.resolve()
    Promise.race([wait, new Promise((r) => setTimeout(r, 2600))])
      .then(() => setTimeout(ready, 900))
    return () => { cancelled = true }
  }, [])

  useFrame((f) => {
    const u = cameraProgress(f.act1, f.act3)

    if (cameraRef.current) {
      cameraRef.current.style.transform =
        `translate3d(${(cam.dx * u).toFixed(2)}px, ${(cam.dy * u).toFixed(2)}px, 0)`
    }

    // Väl inne i skärmen behövs inte rummet — klassen plockar bort det ur
    // renderingen och släpper på pekhändelser till sidan därinne.
    viewportRef.current?.classList.toggle('is-inside', u > 0.985)
  })

  return (
    <>
      <a className="skip-link" href="#kontakt">Hoppa till kontaktuppgifter</a>

      <div className="viewport" ref={viewportRef}>
        <div className="camera" ref={cameraRef}>
          <div className="stage">
            <Room
              screen={<ScreenContent onHeight={setContentHeight} reduced={reduced} />}
            />
          </div>
        </div>

        {/* Rummets titel och kontaktvyn hör ihop med kameraresan. Utan den
            ligger kontakten i stället som en vanlig sektion sist på sidan. */}
        {!reduced && (
          <>
            <TitlePlate />
            <Contact />
            <Hint />
          </>
        )}
        <Nav />
        <Progress />
        <Cursor />
      </div>

      {/* Själva scrollytan: tom, hög och osynlig. */}
      <div className="scroll-spacer" style={{ height: `${total}px` }} aria-hidden="true" />

      {showPreloader && <Preloader done={loaded} />}
    </>
  )
}
