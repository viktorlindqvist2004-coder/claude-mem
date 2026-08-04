import { useEffect, useRef, useState } from 'react'
import { subscribe, type Frame } from './scroll'

/**
 * Kör `cb` en gång per bildruta. Callbacken hålls i en ref så att komponenten
 * aldrig behöver prenumerera om — och därmed aldrig renderas om per bildruta.
 */
export function useFrame(cb: (f: Frame) => void) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => subscribe((f) => ref.current(f)), [])
}

/**
 * Renderar om komponenten först när ett härlett värde faktiskt ändras.
 * Används för sällsynta tillståndsbyten (t.ex. "vi är inne i skärmen nu").
 */
export function useFrameValue<T>(select: (f: Frame) => T, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const last = useRef<T>(initial)
  useFrame((f) => {
    const next = select(f)
    if (next !== last.current) {
      last.current = next
      setValue(next)
    }
  })
  return value
}

export function useViewport() {
  const [size, setSize] = useState(() => ({
    vw: typeof window === 'undefined' ? 1440 : window.innerWidth,
    vh: typeof window === 'undefined' ? 900 : window.innerHeight,
  }))
  useEffect(() => {
    let id = 0
    const onResize = () => {
      clearTimeout(id)
      id = window.setTimeout(
        () => setSize({ vw: window.innerWidth, vh: window.innerHeight }),
        120,
      )
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(id) }
  }, [])
  return size
}

/** Mäter ett elements layouthöjd — opåverkad av transforms. */
export function useMeasuredHeight<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onChange: (h: number) => void,
) {
  const cb = useRef(onChange)
  cb.current = onChange
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => cb.current(el.offsetHeight))
    ro.observe(el)
    cb.current(el.offsetHeight)
    return () => ro.disconnect()
  }, [ref])
}

/**
 * Följer användarens inställning för minskad rörelse. Sidans kameraresa
 * stängs av helt när den är påslagen — en sjufaldig inzoomning är precis den
 * sortens rörelse inställningen finns för att slippa.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** true efter att komponenten monterats — för inledande övergångar. */
export function useMounted(delay = 0) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(id)
  }, [delay])
  return mounted
}
