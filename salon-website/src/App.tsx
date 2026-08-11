import { useRef, useState, useEffect, useCallback } from 'react'
import { Scissors, Star, Phone, Menu, X, ChevronDown } from 'lucide-react'

/* ═══ Icons ═══ */

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const ServiceIcon = ({ type }: { type: string }) => {
  const cls = "w-5 h-5 text-[#d4af37]"
  switch (type) {
    case 'scissors': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
    case 'blade': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21c0 0 3-2 6-2s4 2 6 2c3 0 6-2 6-2V3c0 0-3 2-6 2s-4-2-6-2-6 2-6 2z"/></svg>
    case 'razor': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="8" y="2" width="8" height="6" rx="1"/><path d="M10 8v2a6 6 0 0 0 4 0V8"/><line x1="12" y1="12" x2="12" y2="22"/><line x1="9" y1="22" x2="15" y2="22"/></svg>
    case 'crown': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 17l3-12 5 6 2-8 2 8 5-6 3 12z"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
    case 'diamond': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3h12l4 7-10 11L2 10z"/><path d="M2 10h20"/><path d="M12 21L8.5 10 12 3l3.5 7z"/></svg>
    case 'drop': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
    default: return null
  }
}

/* ═══ Data ═══ */

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1585747860019-8901a572253d?w=1920&q=85&auto=format',
}

const services = [
  { name: 'Herrklippning', price: '300 kr', icon: 'scissors' },
  { name: 'Skinfade', price: '350 kr', icon: 'blade' },
  { name: 'Skägg', price: '200 kr', icon: 'razor' },
  { name: 'Klippning + Skägg', price: '450 kr', icon: 'crown' },
  { name: 'Lyxbehandling Skägg', price: '299 kr', icon: 'diamond' },
  { name: 'Ansiktsbehandling', price: '470 kr', icon: 'drop' },
]

const reviews = [
  { name: 'Thore T.', rating: 5, text: 'Bästa klippningen jag fått i Vänersborg. Professionellt bemötande och otroligt nöjd med resultatet.', source: 'Google' },
  { name: 'John', rating: 5, text: 'I looked homeless when I walked in — walked out looking sharp. These guys know exactly what they\'re doing.', source: 'Google' },
  { name: 'Sifo', rating: 5, text: 'Letat efter en bra barbershop länge och hittade äntligen rätt. Riktigt nöjd. Kommer definitivt tillbaka!', source: 'Google' },
  { name: 'Erik S.', rating: 5, text: 'Proffsigt bemötande varje gång och resultatet blir alltid on point. Rekommenderas starkt!', source: 'Google' },
  { name: 'Andreas P.', rating: 5, text: 'Äntligen en riktig barbershop i Vänersborg! Min fade har aldrig sett bättre ut.', source: 'Google' },
  { name: 'Oscar F.', rating: 5, text: 'Stilren salong med grym atmosfär. Man känner sig som en kung när man lämnar stolen.', source: 'Facebook' },
  { name: 'Marcus L.', rating: 5, text: 'Bästa barberaren i Vänersborg utan tvekan. Skinfaden blev perfekt. Kommer alltid tillbaka!', source: 'Google' },
  { name: 'Simon R.', rating: 5, text: 'Gick dit på rekommendation och har inte klippt mig någon annanstans sedan dess. Bäst i stan.', source: 'Google' },
]

const hours = [
  { day: 'Mån–Fre', time: '10–18' },
  { day: 'Lördag', time: '10–15' },
  { day: 'Söndag', time: 'Stängt' },
]

/* ═══ Helpers ═══ */

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-[#d4af37] text-[#d4af37]" />
      ))}
    </div>
  )
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView(0.15)
  return (
    <div ref={ref} className={`transition-all duration-1000 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/* ═══ Interactive barber background ═══
   One canvas, three scenes that hand over as you scroll, all of them
   reacting to the pointer:

     1. HÅRET   — a full head of hair you can comb through. Strands bend
                  away from the cursor and spring back.
     2. FADEN   — the clipper. Hair is taken down to skin along a taper
                  that tracks the scroll, and the cursor shaves a path
                  that slowly grows back in.
     3. RUTNÄT  — a halftone dot fade, the way a modern fade is drawn on
                  paper. The cursor pushes a ripple through the grid.

   When the pointer has been idle it drifts on its own so the page is
   never static. */

type Strand = {
  x: number; y: number; len: number
  bx: number; by: number // resting direction
  cx: number; cy: number // current direction
  shaved: number
  phase: number
  thick: boolean
}

type Dot = { x: number; y: number; r: number }

const ALPHA_STEPS = 7

function BarberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let w = 0
    let h = 0
    let strands: Strand[] = []
    let dots: Dot[] = []
    let raf = 0
    let scroll = -1
    let clock = 0
    let maxScroll = 1

    // Pointer, plus an idle drift so the effect shows itself unprompted.
    let px = 0
    let py = 0
    let touched = 0

    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

    // Math.hypot and Math.sin are hot here — thousands of calls per frame.
    // A lookup table and plain sqrt keep the loop cheap.
    const SIN_N = 1024
    const SIN = new Float32Array(SIN_N)
    for (let i = 0; i < SIN_N; i++) SIN[i] = Math.sin((i / SIN_N) * Math.PI * 2)
    const fsin = (x: number) => SIN[((x * (SIN_N / (Math.PI * 2))) | 0) & (SIN_N - 1)]

    // Reused every frame so the render loop allocates nothing.
    const silver = [
      Array.from({ length: ALPHA_STEPS }, () => [] as number[]),
      Array.from({ length: ALPHA_STEPS }, () => [] as number[]),
    ]
    const gold = Array.from({ length: ALPHA_STEPS }, () => [] as number[])

    const build = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const small = w < 640
      const gap = small ? 22 : 23
      strands = []
      for (let x = -gap; x <= w + gap; x += gap) {
        for (let y = -gap; y <= h + gap; y += gap) {
          const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.5
          strands.push({
            x: x + (Math.random() - 0.5) * gap,
            y: y + (Math.random() - 0.5) * gap,
            len: gap * (1.35 + Math.random() * 1.35),
            bx: Math.cos(ang), by: Math.sin(ang),
            cx: Math.cos(ang), cy: Math.sin(ang),
            shaved: 0,
            phase: Math.random() * Math.PI * 2,
            thick: Math.random() > 0.72,
          })
        }
      }

      const dgap = small ? 26 : 27
      dots = []
      for (let x = dgap / 2; x < w + dgap; x += dgap) {
        for (let y = dgap / 2; y < h + dgap; y += dgap) {
          dots.push({ x, y, r: dgap * 0.34 })
        }
      }

      if (!touched) { px = w * 0.5; py = h * 0.45 }
      measureScroll()
    }

    const measureScroll = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    }

    const onPointer = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      touched = performance.now()
    }
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      px = t.clientX
      py = t.clientY
      touched = performance.now()
    }

    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return

      // maxScroll is cached: reading scrollHeight forces a full layout, and
      // doing that every frame costs more than everything drawn below.
      const p = clamp01(window.scrollY / maxScroll)
      scroll = scroll < 0 ? p : scroll + (p - scroll) * 0.12
      if (!reduced) clock += 0.016

      // Idle drift — a slow lissajous so the page breathes on its own.
      if (!reduced && performance.now() - touched > 2600) {
        px += ((w * (0.5 + 0.32 * Math.sin(clock * 0.31))) - px) * 0.02
        py += ((h * (0.5 + 0.26 * Math.sin(clock * 0.23 + 1.7))) - py) * 0.02
      }

      // Scene weights. Hair hands over to the fade, the fade to the grid.
      const wHair = 1 - clamp01((scroll - 0.26) / 0.1)
      const wGrid = clamp01((scroll - 0.62) / 0.1)
      const wFade = Math.max(0, 1 - wHair - wGrid)
      const wStrand = wHair + wFade

      ctx.clearRect(0, 0, w, h)

      /* ── Scenes 1 + 2: the strand field ───────────────────────────── */
      if (wStrand > 0.01) {
        // The clipper line, sweeping down the page as the fade takes over.
        const line = -0.25 + clamp01((scroll - 0.2) / 0.5) * 1.5
        const combR = Math.min(w, h) * 0.3
        const clipR = Math.min(w, h) * 0.14

        for (const bucket of silver) for (const a of bucket) a.length = 0
        for (const a of gold) a.length = 0

        const combR2 = combR * combR
        const clipR2 = clipR * clipR

        for (const s of strands) {
          const dx = s.x - px
          const dy = s.y - py
          const d2 = dx * dx + dy * dy

          // Comb: strands lean away from the pointer, then spring back.
          let tx = s.bx
          let ty = s.by
          let dist = 0
          if (d2 < combR2 && wHair > 0.01) {
            dist = Math.sqrt(d2) || 1
            const q = 1 - dist / combR
            const f = q * q * wHair
            const mx = s.bx * (1 - f) + (dx / dist) * f * 1.6
            const my = s.by * (1 - f) + (dy / dist) * f * 1.6
            const m = Math.sqrt(mx * mx + my * my) || 1
            tx = mx / m
            ty = my / m
          }
          if (!reduced) tx += fsin(clock * 1.1 + s.phase) * 0.05
          s.cx += (tx - s.cx) * 0.12
          s.cy += (ty - s.cy) * 0.12

          // Clipper: shave under the pointer, regrow over a few seconds.
          if (d2 < clipR2 && wFade > 0.01) {
            const dc = Math.sqrt(d2)
            s.shaved = Math.max(s.shaved, (1 - dc / clipR) * wFade)
          }
          s.shaved *= 0.994

          // Taper along the clipper line: full length above, skin below.
          const d = (s.y / h - line) / 0.28
          const k = d < -1 ? -1 : d > 1 ? 1 : d
          const u = (k + 1) * 0.5
          const taper = 0.14 + 0.86 * u * u * (3 - 2 * u)
          const growth = (wHair + wFade * taper) / wStrand
          const cut = growth * (1 - s.shaved * 0.88)

          // cx/cy stay near unit length as they chase normalized targets,
          // so the per-strand renormalization is not worth its sqrt.
          const len = s.len * cut
          const x2 = s.x + s.cx * len
          const y2 = s.y + s.cy * len

          const ai = Math.min(ALPHA_STEPS - 1, (((0.2 + cut * 0.8) * ALPHA_STEPS) | 0))
          silver[s.thick ? 1 : 0][ai].push(s.x, s.y, x2, y2)

          // Gold picks out the taper and the hair riding the comb.
          // dist is only resolved inside the comb radius, so gate on d2.
          const glowFade = wFade * Math.max(0, 1 - Math.abs(d))
          let glowComb = 0
          if (d2 < combR2 && dist > 0) {
            const q = 1 - dist / combR
            glowComb = wHair * q * q
          }
          // Gold strands are drawn a second time, so keep the band tight.
          const glow = Math.max(glowFade, glowComb)
          if (glow > 0.22) {
            const gi = Math.min(ALPHA_STEPS - 1, (glow * ALPHA_STEPS) | 0)
            gold[gi].push(s.x, s.y, x2, y2)
          }
        }

        // 'round' caps rasterize two arcs per segment; at a few thousand
        // hair-thin strands that cost is invisible but not cheap.
        ctx.lineCap = 'butt'
        const stroke = (arr: number[]) => {
          ctx.beginPath()
          for (let i = 0; i < arr.length; i += 4) {
            ctx.moveTo(arr[i], arr[i + 1])
            ctx.lineTo(arr[i + 2], arr[i + 3])
          }
          ctx.stroke()
        }

        for (let t = 0; t < 2; t++) {
          ctx.lineWidth = t === 0 ? 0.75 : 1.4
          for (let a = 0; a < ALPHA_STEPS; a++) {
            if (!silver[t][a].length) continue
            const al = ((a + 1) / ALPHA_STEPS) * 0.34 * wStrand
            ctx.strokeStyle = `rgba(228,233,242,${al.toFixed(3)})`
            stroke(silver[t][a])
          }
        }

        ctx.lineWidth = 1.2
        for (let a = 0; a < ALPHA_STEPS; a++) {
          if (!gold[a].length) continue
          const al = ((a + 1) / ALPHA_STEPS) * 0.5 * wStrand
          ctx.strokeStyle = `rgba(212,175,55,${al.toFixed(3)})`
          stroke(gold[a])
        }

        // The clipper head itself.
        if (wFade > 0.15) {
          const g = ctx.createRadialGradient(px, py, 0, px, py, clipR)
          g.addColorStop(0, `rgba(212,175,55,${(0.13 * wFade).toFixed(3)})`)
          g.addColorStop(1, 'rgba(212,175,55,0)')
          ctx.fillStyle = g
          ctx.fillRect(px - clipR, py - clipR, clipR * 2, clipR * 2)
        }
      }

      /* ── Scene 3: halftone fade ───────────────────────────────────── */
      if (wGrid > 0.01) {
        const t = (scroll - 0.62) / 0.38
        const edge = t * 1.4 - 0.35
        const GOLD_R = 210
        const TAU = Math.PI * 2

        // Radius per dot is wanted twice, so resolve it once per pass.
        const radius = (d: Dot, dist: number) => {
          const along = (d.x / w) * 0.35 + (d.y / h) * 0.65
          let f = clamp01((along - edge) * 1.9)
          f += fsin(dist * 0.045 - clock * 2.4) * Math.exp(-dist / 260) * 0.65
          return d.r * clamp01(f)
        }

        ctx.fillStyle = `rgba(228,233,242,${(0.3 * wGrid).toFixed(3)})`
        ctx.beginPath()
        for (const d of dots) {
          const ddx = d.x - px
          const ddy = d.y - py
          const r = radius(d, Math.sqrt(ddx * ddx + ddy * ddy))
          if (r < 0.35) continue
          ctx.moveTo(d.x + r, d.y)
          ctx.arc(d.x, d.y, r, 0, TAU)
        }
        ctx.fill()

        // A gold pass on the dots nearest the pointer.
        ctx.fillStyle = `rgba(212,175,55,${(0.42 * wGrid).toFixed(3)})`
        ctx.beginPath()
        for (const d of dots) {
          const ddx = d.x - px
          const ddy = d.y - py
          const dd2 = ddx * ddx + ddy * ddy
          if (dd2 > GOLD_R * GOLD_R) continue
          const dist = Math.sqrt(dd2)
          const r = radius(d, dist) * (1 - dist / GOLD_R)
          if (r < 0.35) continue
          ctx.moveTo(d.x + r, d.y)
          ctx.arc(d.x, d.y, r, 0, TAU)
        }
        ctx.fill()
      }
    }

    let resizeTimer: number | undefined
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(build, 150)
    }

    build()
    frame()
    // Re-measure only when the document actually changes height (images
    // loading, fonts swapping in) rather than polling it every frame.
    const ro = new ResizeObserver(measureScroll)
    ro.observe(document.body)
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(resizeTimer)
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className="fixed inset-0 z-0 pointer-events-none" />
}

/* ═══ App ═══ */

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [heroScale, setHeroScale] = useState(1.8)
  const [heroDetailsOpacity, setHeroDetailsOpacity] = useState(0)
  const heroWrapRef = useRef<HTMLDivElement>(null)

  const servicesAnim = useInView()
  const contactAnim = useInView()

  useEffect(() => {
    let ticking = false
    const update = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0)

      const wrap = heroWrapRef.current
      if (wrap) {
        const wrapRect = wrap.getBoundingClientRect()
        const scrollableHeight = wrap.offsetHeight - window.innerHeight
        const rawProgress = Math.max(0, Math.min(1, -wrapRect.top / scrollableHeight))
        const scale = 1.8 - rawProgress * 0.8
        setHeroScale(scale)
        const detailsFade = Math.max(0, Math.min(1, (rawProgress - 0.7) / 0.3))
        setHeroDetailsOpacity(detailsFade)
      }

      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const rect = el.parentElement!.getBoundingClientRect()
        const offset = rect.top / window.innerHeight
        el.style.transform = `translateY(${offset * -40}px) scale(1.08)`
      })
      ticking = false
    }
    const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true } }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }, [])

  return (
    <div className="min-h-screen rich-bg grain-overlay" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>

      <BarberBackground />

      <div className="relative z-10">

      {/* Progress bar */}
      <div className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-[#d4af37] via-[#b8860b] to-[#d4af37] z-[200]"
        style={{ width: `${scrollProgress * 100}%` }} />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-6"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
        <button onClick={() => scrollTo('hero')} className="flex items-center gap-2 group cursor-pointer bg-transparent border-none">
          <Scissors className="w-5 h-5 text-[#d4af37] transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-white text-xl font-script">Gentlemen's</span>
        </button>
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Om Oss', id: 'about' },
            { label: 'Tjänster', id: 'services' },
            { label: 'Omdömen', id: 'reviews' },
            { label: 'Besök', id: 'contact' },
          ].map(({ label, id }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className="text-white/50 hover:text-[#d4af37] text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-300 bg-transparent border-none cursor-pointer">
              {label}
            </button>
          ))}
          <a href="tel:+46762149929"
            className="bg-transparent border border-[#d4af37]/30 text-[#d4af37] text-[11px] font-bold px-5 py-2 hover:bg-[#d4af37] hover:text-black transition-all duration-500 tracking-[0.15em] uppercase no-underline">
            076-214 99 29
          </a>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white bg-transparent border-none cursor-pointer p-2">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-[99] bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center gap-6 transition-all duration-700 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {[
          { label: 'Om Oss', id: 'about' },
          { label: 'Salongen', id: 'salon' },
          { label: 'Hantverket', id: 'craft' },
          { label: 'Tjänster', id: 'services' },
          { label: 'Omdömen', id: 'reviews' },
          { label: 'Besök', id: 'contact' },
        ].map(({ label, id }) => (
          <button key={id} onClick={() => scrollTo(id)}
            className="text-white/70 text-lg font-light uppercase tracking-[0.3em] hover:text-[#d4af37] transition-all duration-300 bg-transparent border-none cursor-pointer">
            {label}
          </button>
        ))}
        <a href="tel:+46762149929"
          className="mt-4 border border-[#d4af37]/30 text-[#d4af37] text-sm font-bold px-10 py-3 tracking-[0.2em] uppercase no-underline hover:bg-[#d4af37] hover:text-black transition-all duration-500">
          Boka Din Tid
        </a>
      </div>

      {/* ═══ HERO — scroll-shrink ═══ */}
      <div ref={heroWrapRef} style={{ height: '180vh' }}>
        <section id="hero" className="sticky top-0 h-screen overflow-hidden">
          <div data-parallax className="absolute inset-[-8%] bg-cover bg-center"
            style={{ backgroundImage: `url(${IMAGES.hero})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />

          {/* Decorative gold corner accents */}
          <div className="absolute top-0 left-0 w-32 h-32 z-[5] pointer-events-none"
            style={{ borderTop: '1px solid #d4af37', borderLeft: '1px solid #d4af37', margin: '2rem', opacity: heroDetailsOpacity * 0.2 }} />
          <div className="absolute top-0 right-0 w-32 h-32 z-[5] pointer-events-none"
            style={{ borderTop: '1px solid #d4af37', borderRight: '1px solid #d4af37', margin: '2rem', opacity: heroDetailsOpacity * 0.2 }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 z-[5] pointer-events-none"
            style={{ borderBottom: '1px solid #d4af37', borderLeft: '1px solid #d4af37', margin: '2rem', opacity: heroDetailsOpacity * 0.2 }} />
          <div className="absolute bottom-0 right-0 w-32 h-32 z-[5] pointer-events-none"
            style={{ borderBottom: '1px solid #d4af37', borderRight: '1px solid #d4af37', margin: '2rem', opacity: heroDetailsOpacity * 0.2 }} />

          <div className="absolute inset-0 z-[4] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 70%)' }} />

          <div className="ft-vignette" />

          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-5">
            <h1 className="font-script text-white leading-none will-change-transform"
              style={{
                fontSize: 'clamp(4rem, 10vw, 14rem)',
                transform: `scale(${heroScale})`,
                textShadow: '0 2px 4px rgba(212,175,55,0.15), 0 4px 20px rgba(0,0,0,0.6), 0 8px 40px rgba(0,0,0,0.4)',
              }}>
              Gentlemen's
            </h1>

            <div style={{ opacity: heroDetailsOpacity, transform: `translateY(${(1 - heroDetailsOpacity) * 20}px)` }}
              className="will-change-transform">
              <p className="text-[#d4af37]/90 text-sm sm:text-base md:text-lg mt-2 font-semibold tracking-[0.5em] uppercase"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
                Barbershop
              </p>
              <p className="section-label mt-4 text-[9px]">Edsgatan 23 &middot; Vänersborg</p>
              <div className="gold-line active mx-auto mt-6" />
              <a href="tel:+46762149929"
                className="inline-block mt-6 bg-transparent border border-[#d4af37]/40 text-[#d4af37] text-[11px] font-bold px-10 py-4 tracking-[0.3em] uppercase hover:bg-[#d4af37] hover:text-black transition-all duration-500 no-underline pulse-glow">
                Boka Din Tid
              </a>
            </div>
          </div>

          <button onClick={() => scrollTo('about')}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 transition-colors bg-transparent border-none cursor-pointer animate-bounce"
            style={{ opacity: heroDetailsOpacity * 0.4, color: 'rgba(255,255,255,0.5)' }}>
            <ChevronDown className="w-6 h-6" />
          </button>
        </section>
      </div>

      {/* ═══ OM OSS ═══ */}
      <section id="about" className="relative bg-transparent py-24 sm:py-32">
        <div className="absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#080808] z-20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 sm:px-10">
          <FadeIn>
            <p className="section-label mb-4">Om Oss</p>
            <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl mb-6">Mer än en klippning</h2>
            <div className="gold-line active" style={{ margin: '0 auto 0 0' }} />
          </FadeIn>

          <FadeIn delay={200}>
            <p className="text-white/70 text-base sm:text-lg leading-relaxed mt-8 max-w-2xl">
              Gentlemen's Barbershop grundades med en enkel vision — att skapa en plats
              där kvalitet aldrig kompromissas. Vi tror på hantverket, på att ta sig tid,
              och på att varje kund ska lämna stolen med en känsla av att ha fått det bästa.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-14">
            {[
              { title: 'Premiumprodukter', desc: 'Vi använder bara de bästa varumärkena inom herrgrooming. Inga genvägar, inga kompromisser.' },
              { title: 'Tid för dig', desc: 'Varje besök bokas med marginal. Ingen stress, inga köer — du får den tid du behöver.' },
              { title: 'Ständig utveckling', desc: 'Vi utbildar oss kontinuerligt i de senaste teknikerna. Klassiskt hantverk möter modern precision.' },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={300 + i * 150}>
                <div className="border border-white/[0.06] p-6 hover:border-[#d4af37]/20 transition-all duration-700">
                  <div className="w-8 h-px bg-[#d4af37]/50 mb-4" />
                  <h3 className="text-white/90 text-sm font-bold uppercase tracking-[0.1em] mb-3">{item.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SALONGEN ═══ */}
      <section id="salon" className="relative min-h-screen flex items-center px-6 sm:px-14 md:px-20 py-24">
        <div className="max-w-lg rounded-2xl border border-white/10 bg-white/[0.045] p-8 sm:p-10">
          <FadeIn>
            <p className="section-label mb-4">Salongen</p>
            <h2 className="hero-title text-4xl sm:text-5xl md:text-7xl mb-4">
              Designad för<br />din stund
            </h2>
            <div className="gold-line active" style={{ margin: '1.5rem auto 1.5rem 0' }} />
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-white/70 text-base leading-relaxed mt-4">
              Läder, mässing och varma träslag. Vår salong på Edsgatan 23 är byggd
              för att du ska kunna slappna av. Ingen stress, inga köer — bara hantverk
              och en stund för dig själv.
            </p>
          </FadeIn>
          <FadeIn delay={400}>
            <div className="flex flex-wrap gap-3 mt-8">
              {['Klassisk inredning', 'Avslappnad atmosfär', 'Centralt läge'].map(tag => (
                <span key={tag} className="text-[10px] text-[#d4af37]/70 uppercase tracking-[0.15em] border border-[#d4af37]/15 px-3 py-1.5">
                  {tag}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ HANTVERKET ═══ */}
      <section id="craft" className="relative min-h-screen flex items-center justify-end px-6 sm:px-14 md:px-20 py-24">
        <div className="max-w-lg text-right rounded-2xl border border-white/10 bg-white/[0.045] p-8 sm:p-10">
          <FadeIn>
            <p className="section-label mb-4">Hantverket</p>
            <h2 className="hero-title text-4xl sm:text-5xl md:text-7xl mb-4">
              Precision i<br />varje detalj
            </h2>
            <div className="gold-line active" style={{ margin: '1.5rem 0 1.5rem auto' }} />
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-white/70 text-base leading-relaxed mt-4">
              Från klassiska herrklippningar till skinfades med rakkniv. Vi behärskar
              både traditionella och moderna tekniker — alltid med rakkniv, varma handdukar
              och öga för detaljen. Varje klippning avslutas med styling och personliga
              tips för att hålla looken hemma.
            </p>
          </FadeIn>
          <FadeIn delay={400}>
            <div className="flex flex-wrap justify-end gap-3 mt-8">
              {['Skinfade', 'Rakkniv', 'Varma handdukar', 'Skäggvård'].map(tag => (
                <span key={tag} className="text-[10px] text-[#d4af37]/70 uppercase tracking-[0.15em] border border-[#d4af37]/15 px-3 py-1.5">
                  {tag}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ TJÄNSTER ═══ */}
      <section id="services" className="relative bg-transparent py-24 sm:py-32">
        <div ref={servicesAnim.ref} className="w-full max-w-5xl mx-auto px-6 sm:px-10">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl" style={{ textTransform: 'none', paddingTop: '0.15em' }}>TJÄNSTER</h2>
              <div className={`gold-line ${servicesAnim.visible ? 'active' : ''}`} />
              <p className="text-white/50 text-sm mt-4">Ring för att boka din tid</p>
            </div>
          </FadeIn>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children ${servicesAnim.visible ? 'active' : ''}`}>
            {services.map((s) => (
              <div key={s.name}
                className="group border border-white/[0.05] hover:border-[#d4af37]/25 p-6 sm:p-8 transition-all duration-700 hover:bg-white/[0.015] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/0 group-hover:via-[#d4af37]/20 to-transparent transition-all duration-700" />
                <div className="flex items-center gap-3 mb-4">
                  <ServiceIcon type={s.icon} />
                  <h3 className="text-white/80 text-sm font-bold uppercase tracking-[0.12em]">{s.name}</h3>
                </div>
                <div className="flex items-center">
                  <div className="flex-1 h-px bg-gradient-to-r from-[#d4af37]/0 group-hover:from-[#d4af37]/30 to-transparent transition-all duration-1000" />
                  <span className="text-[#d4af37] text-lg font-bold ml-4 whitespace-nowrap tabular-nums">{s.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ OMDÖMEN ═══ */}
      <section id="reviews" className="relative bg-transparent py-24 sm:py-28 overflow-hidden">

        <FadeIn className="text-center mb-10 px-5">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-[#d4af37] text-[#d4af37]" />)}
            </div>
            <span className="text-white/40 text-xs font-medium">5.0</span>
          </div>
          <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl">Omdömen</h2>
          <div className="gold-line active" />
        </FadeIn>

        <div className="overflow-hidden mb-4">
          <div className="review-ticker" style={{ animationDuration: '50s' }}>
            {[...reviews, ...reviews].map((r, i) => (
              <div key={i} className="review-card min-w-[300px] max-w-[360px] flex-shrink-0">
                <p className="text-white/60 text-sm leading-relaxed mb-4 relative z-10">{r.text}</p>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/15 flex items-center justify-center">
                      <span className="text-[#d4af37] text-[10px] font-bold">{r.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-white/80 text-[11px] font-semibold">{r.name}</p>
                      <StarRating count={r.rating} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-white/20 text-[8px] uppercase tracking-widest">
                    {r.source === 'Google' ? <GoogleIcon className="w-3 h-3" /> : <FacebookIcon className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="review-ticker" style={{ animationDuration: '55s', animationDirection: 'reverse' }}>
            {[...reviews.slice(4), ...reviews.slice(0, 4), ...reviews.slice(4), ...reviews.slice(0, 4)].map((r, i) => (
              <div key={i} className="review-card min-w-[300px] max-w-[360px] flex-shrink-0">
                <p className="text-white/60 text-sm leading-relaxed mb-4 relative z-10">{r.text}</p>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/15 flex items-center justify-center">
                      <span className="text-[#d4af37] text-[10px] font-bold">{r.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-white/80 text-[11px] font-semibold">{r.name}</p>
                      <StarRating count={r.rating} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-white/20 text-[8px] uppercase tracking-widest">
                    {r.source === 'Google' ? <GoogleIcon className="w-3 h-3" /> : <FacebookIcon className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BOKA ═══ */}
      <section className="relative bg-transparent py-20 sm:py-24 text-center">
        <FadeIn className="px-5">
          <h2 className="hero-title text-4xl sm:text-5xl md:text-7xl mb-4">Redo?</h2>
          <p className="text-white/50 text-base mb-10 max-w-md mx-auto">
            Ring oss direkt eller besök salongen på Edsgatan 23. Drop-in välkomnas men bokning rekommenderas.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="tel:+46762149929"
              className="border border-[#d4af37]/40 text-[#d4af37] text-sm font-bold px-12 py-4 tracking-[0.2em] uppercase hover:bg-[#d4af37] hover:text-black transition-all duration-500 no-underline pulse-glow">
              076-214 99 29
            </a>
            <a href="https://maps.google.com/?q=Edsgatan+23+V%C3%A4nersborg" target="_blank" rel="noopener noreferrer"
              className="border border-white/15 text-white/50 text-sm font-bold px-12 py-4 tracking-[0.15em] uppercase hover:bg-white/10 hover:text-white transition-all duration-500 no-underline">
              Hitta Hit
            </a>
          </div>
        </FadeIn>
      </section>

      {/* ═══ BESÖK / KARTA ═══ */}
      <section id="contact" className="relative bg-transparent py-24 sm:py-28">
        <div ref={contactAnim.ref} className="w-full max-w-6xl mx-auto px-6 sm:px-10">
          <FadeIn>
            <p className="section-label mb-3">Besök Salongen</p>
            <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl mb-3">Kom Förbi</h2>
            <div className={`gold-line ${contactAnim.visible ? 'active' : ''}`} style={{ margin: '1.5rem auto 1.5rem 0' }} />
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
            <FadeIn delay={200}>
              <div className="space-y-8">
                <div>
                  <p className="text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.35em] mb-3">Adress</p>
                  <p className="text-white text-lg font-medium">Edsgatan 23</p>
                  <p className="text-white/40 text-sm">462 33 Vänersborg</p>
                </div>
                <div>
                  <p className="text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.35em] mb-3">Öppettider</p>
                  <div className="space-y-1.5">
                    {hours.map(h => (
                      <div key={h.day} className="flex justify-between items-center py-1 border-b border-white/[0.04] last:border-none max-w-xs">
                        <span className="text-white/45 text-sm">{h.day}</span>
                        <span className={`text-sm font-medium tabular-nums ${h.time === 'Stängt' ? 'text-white/20' : 'text-white/80'}`}>{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.35em] mb-3">Kontakt</p>
                  <a href="tel:+46762149929" className="flex items-center gap-3 text-white/60 hover:text-[#d4af37] transition-all duration-300 text-sm no-underline group">
                    <Phone className="w-4 h-4 group-hover:scale-110 transition-transform" /> 076-214 99 29
                  </a>
                  <div className="flex items-center gap-2.5 mt-5">
                    <a href="https://www.facebook.com/p/Gentlemens-Barbershop-100063546855196/" target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 border border-white/[0.08] flex items-center justify-center hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all duration-500 text-white/30 hover:bg-[#d4af37]/5">
                      <FacebookIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <a href="tel:+46762149929"
                  className="inline-block border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold px-8 py-3.5 tracking-[0.2em] uppercase hover:bg-[#d4af37] hover:text-black transition-all duration-500 no-underline">
                  Boka Din Tid
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={400}>
              <div className="w-full h-full min-h-[400px] bg-[#0c0c0c] border border-white/[0.06] overflow-hidden relative">
                <iframe
                  title="Karta"
                  src="https://maps.google.com/maps?q=Edsgatan+23,+462+33+V%C3%A4nersborg&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full min-h-[400px] border-0 grayscale invert opacity-70"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="absolute inset-0 border border-[#d4af37]/10 pointer-events-none" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-transparent py-12 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-[#d4af37]/40" />
              <span className="text-white/30 text-base font-script">Gentlemen's Barbershop</span>
            </div>
            <p className="text-white/15 text-xs tracking-wide">Edsgatan 23, Vänersborg</p>
            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/p/Gentlemens-Barbershop-100063546855196/" target="_blank" rel="noopener noreferrer"
                className="text-white/15 hover:text-[#d4af37] transition-colors duration-500">
                <FacebookIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      </div>
    </div>
  )
}

export default App
