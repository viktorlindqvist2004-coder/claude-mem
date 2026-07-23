import { useRef, useState, useEffect, useCallback, forwardRef } from 'react'
import { Scissors, Star, Phone, Menu, X } from 'lucide-react'
import './App.css'

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><circle cx="12" cy="12" r="5"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.51"/>
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

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1585747860019-8901a572253d?w=1920&q=85&auto=format',
  atmosphere: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1920&q=85&auto=format',
  craft: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1920&q=85&auto=format',
  cta: 'https://images.unsplash.com/photo-1587909209111-a8cc43812da8?w=1920&q=85&auto=format',
}

const VIDEOS = {
  hero: 'https://videos.pexels.com/video-files/4177561/4177561-uhd_2560_1440_25fps.mp4',
  craft: 'https://videos.pexels.com/video-files/3993394/3993394-hd_1920_1080_30fps.mp4',
  cta: 'https://videos.pexels.com/video-files/4718407/4718407-uhd_2560_1440_25fps.mp4',
}

const sections = [
  { id: 'hero', label: '' },
  { id: 'atmosphere', label: 'Salongen' },
  { id: 'craft', label: 'Hantverket' },
  { id: 'reviews', label: 'Omdömen' },
  { id: 'services', label: 'Tjänster' },
  { id: 'cta', label: 'Boka' },
]

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

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}

function GoldParticles({ count = 8 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    left: `${8 + Math.random() * 84}%`,
    top: `${10 + Math.random() * 80}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${6 + Math.random() * 6}s`,
    anim: i % 3 === 0 ? 'particleFloat1' : i % 3 === 1 ? 'particleFloat2' : 'particleFloat3',
    size: 2 + Math.random() * 3,
  }))
  return (
    <div className="gold-particles">
      {particles.map((p, i) => (
        <div key={i} className="gold-particle"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size,
            animation: `${p.anim} ${p.duration} ease-in-out ${p.delay} infinite` }} />
      ))}
    </div>
  )
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-[#d4af37] text-[#d4af37]" />
      ))}
    </div>
  )
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function FtVideo({ src, poster }: { src: string; poster: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <video data-ft-video className="ft-video" autoPlay muted loop playsInline
      poster={poster} onError={() => setFailed(true)}>
      <source src={src} type="video/mp4" />
    </video>
  )
}

const FlySection = forwardRef<HTMLElement, {
  image: string; video?: string; title: React.ReactNode; subtitle?: string;
  align?: 'right' | 'center'; flare?: boolean;
}>(function FlySection({ image, video, title, subtitle, align = 'left', flare }, ref) {
  return (
    <section ref={ref} className="ft-section bg-black">
      <div data-ft-bg className="ft-bg" style={{ backgroundImage: `url(${image})` }} />
      {video && <FtVideo src={video} poster={image} />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/15 to-black/70 z-[1]" />
      <div className="ft-vignette" />
      {flare && (
        <div data-ft-flare className="anamorphic-flare-wrap">
          <div className="anamorphic-streak" style={{ top: '40%' }} />
          <div className="anamorphic-orb" style={{ top: 'calc(40% - 40px)', left: '62%' }} />
          <div className="anamorphic-orb secondary" style={{ top: 'calc(40% - 20px)', left: '38%' }} />
        </div>
      )}
      <GoldParticles count={6} />
      <div className={`absolute inset-0 z-[5] flex items-center ${
        align === 'center' ? 'justify-center text-center px-5' :
        align === 'right' ? 'justify-end text-right px-6 sm:px-14 md:px-20' :
        'px-6 sm:px-14 md:px-20'
      }`}>
        <div data-ft-content className="max-w-2xl" style={{ willChange: 'opacity, transform, filter' }}>
          <h2 className="hero-title text-5xl sm:text-7xl md:text-8xl lg:text-9xl">{title}</h2>
          {subtitle && (
            <>
              <div className="gold-line active" style={{
                margin: align === 'right' ? '1.5rem 0 1.5rem auto' :
                  align === 'center' ? '1.5rem auto' : '1.5rem auto 1.5rem 0'
              }} />
              <p className={`text-white/40 text-sm sm:text-base tracking-wide max-w-md ${
                align === 'right' ? 'ml-auto' : align === 'center' ? 'mx-auto' : ''
              }`}>{subtitle}</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
})

function App() {
  const sectionsRef = useRef<(HTMLElement | null)[]>([])
  const [activeSection, setActiveSection] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [heroReady, setHeroReady] = useState(false)

  const setSectionRef = useCallback((idx: number) => (el: HTMLElement | null) => {
    sectionsRef.current[idx] = el
  }, [])

  useEffect(() => { setTimeout(() => setHeroReady(true), 100) }, [])

  useEffect(() => {
    let ticking = false
    const update = () => {
      const vh = window.innerHeight
      const maxScroll = document.documentElement.scrollHeight - vh
      setScrollProgress(maxScroll > 0 ? window.scrollY / maxScroll : 0)

      let bestIdx = 0
      let bestDist = Infinity

      sectionsRef.current.forEach((el, i) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        const center = rect.top + rect.height / 2
        const dist = Math.abs(center - vh / 2)
        if (dist < bestDist) { bestDist = dist; bestIdx = i }

        const offset = (center - vh / 2) / vh
        const absOffset = Math.abs(offset)

        const bg = el.querySelector('[data-ft-bg]') as HTMLElement
        if (bg) {
          if (absOffset < 1.2) {
            const t = smoothstep(1 - absOffset / 1.2)
            const scale = offset > 0 ? 0.8 + t * 0.22 : 1.02 + (1 - t) * 0.18
            bg.style.transform = `scale(${scale})`
            bg.style.opacity = `${Math.min(1, t * 1.6)}`
            bg.style.filter = `blur(${(1 - t) * 12}px)`
          } else {
            bg.style.opacity = '0'
          }
        }

        const video = el.querySelector('[data-ft-video]') as HTMLElement
        if (video) {
          if (absOffset < 0.9) {
            const t = smoothstep(1 - absOffset / 0.9)
            video.style.opacity = `${t}`
            video.style.filter = `blur(${(1 - t) * 6}px)`
          } else {
            video.style.opacity = '0'
          }
        }

        const content = el.querySelector('[data-ft-content]') as HTMLElement
        if (content) {
          if (absOffset < 0.65) {
            const t = smoothstep(1 - absOffset / 0.65)
            content.style.opacity = `${t}`
            content.style.transform = `translateY(${offset * 80}px) scale(${0.9 + t * 0.1})`
            content.style.filter = `blur(${(1 - t) * 4}px)`
          } else {
            content.style.opacity = '0'
            content.style.transform = `translateY(${offset > 0 ? 60 : -60}px) scale(0.9)`
          }
        }

        const flare = el.querySelector('[data-ft-flare]') as HTMLElement
        if (flare) {
          flare.style.opacity = absOffset < 0.45 ? `${smoothstep(1 - absOffset / 0.45)}` : '0'
        }
      })

      setActiveSection(bestIdx)
      ticking = false
    }

    const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true } }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    update()
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  const scrollToSection = useCallback((idx: number) => {
    sectionsRef.current[idx]?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }, [])

  const servicesAnim = useInView()
  const reviewsAnim = useInView()

  return (
    <div className="min-h-screen bg-[#070707] grain-overlay" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Progress */}
      <div className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-[#d4af37] via-[#b8860b] to-[#d4af37] z-[200]"
        style={{ width: `${scrollProgress * 100}%` }} />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-6"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <button onClick={() => scrollToSection(0)} className="flex items-center gap-2 group cursor-pointer bg-transparent border-none">
          <Scissors className="w-5 h-5 text-[#d4af37] transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-white text-lg font-playfair italic tracking-wide">Gentlemen's</span>
        </button>
        <div className="hidden md:flex items-center gap-8">
          {['Omdömen', 'Tjänster', 'Boka'].map((label) => (
            <button key={label}
              onClick={() => scrollToSection(label === 'Omdömen' ? 3 : label === 'Tjänster' ? 4 : 5)}
              className="text-white/40 hover:text-[#d4af37] text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-300 bg-transparent border-none cursor-pointer">
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
        {sections.filter(s => s.label).map((s) => (
          <button key={s.id} onClick={() => scrollToSection(sections.indexOf(s))}
            className="text-white/70 text-lg font-light uppercase tracking-[0.3em] hover:text-[#d4af37] transition-all duration-300 bg-transparent border-none cursor-pointer">
            {s.label}
          </button>
        ))}
        <a href="tel:+46762149929"
          className="mt-4 border border-[#d4af37]/30 text-[#d4af37] text-sm font-bold px-10 py-3 tracking-[0.2em] uppercase no-underline hover:bg-[#d4af37] hover:text-black transition-all duration-500">
          Boka Din Tid
        </a>
      </div>

      {/* Dots */}
      <div className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-3">
        {sections.map((s, i) => (
          <button key={s.id} onClick={() => scrollToSection(i)}
            className="group relative bg-transparent border-none cursor-pointer p-1" title={s.label || 'Hem'}>
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${
              activeSection === i
                ? 'bg-[#d4af37] scale-[2] shadow-[0_0_12px_rgba(212,175,55,0.5)]'
                : 'bg-white/15 hover:bg-white/40 hover:scale-150'
            }`} />
            {s.label && (
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/0 group-hover:text-white/50 text-[9px] uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-300 pointer-events-none font-medium">
                {s.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ 1. HERO ═══ */}
      <section ref={setSectionRef(0)} className="ft-section bg-black">
        <div data-ft-bg className="ft-bg" style={{ backgroundImage: `url(${IMAGES.hero})` }} />
        <FtVideo src={VIDEOS.hero} poster={IMAGES.hero} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80 z-[1]" />
        <div className="ft-vignette" />
        <div data-ft-flare className="anamorphic-flare-wrap">
          <div className="anamorphic-streak" style={{ top: '38%' }} />
          <div className="anamorphic-orb" style={{ top: 'calc(38% - 40px)', left: '62%' }} />
          <div className="anamorphic-orb secondary" style={{ top: 'calc(38% - 20px)', left: '38%' }} />
        </div>
        <GoldParticles count={6} />
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-center px-5">
          <div data-ft-content style={{ willChange: 'opacity, transform, filter' }}>
            <div className={`stagger-children ${heroReady ? 'active' : ''}`}>
              <p className="section-label mb-6 text-[9px]">Edsgatan 23 &middot; Vänersborg</p>
              <h1 className="hero-title text-7xl sm:text-8xl md:text-[10rem] lg:text-[12rem]">
                Gentlemen's
              </h1>
              <p className="font-playfair italic text-[#d4af37]/80 text-xl sm:text-2xl md:text-3xl mt-2"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
                Barbershop
              </p>
              <div className="gold-line active mx-auto mt-8" />
              <a href="tel:+46762149929"
                className="inline-block mt-8 bg-transparent border border-[#d4af37]/30 text-[#d4af37] text-[10px] font-bold px-10 py-4 tracking-[0.3em] uppercase hover:bg-[#d4af37] hover:text-black transition-all duration-500 no-underline pulse-glow">
                Boka Din Tid
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. SALONGEN ═══ */}
      <FlySection
        ref={setSectionRef(1)}
        image={IMAGES.atmosphere}
        title={<>Läder.<br/>Mässing.<br/>Precision.</>}
        subtitle="Byggt för ritualen — inte stressen."
        flare
      />

      {/* ═══ 3. HANTVERKET ═══ */}
      <FlySection
        ref={setSectionRef(2)}
        image={IMAGES.craft}
        video={VIDEOS.craft}
        title={<>Varje<br/>Linje</>}
        subtitle="Skinfades, rakkniv, varma handdukar. Tusentals timmar i stolen."
        align="right"
        flare
      />

      {/* ═══ 4. OMDÖMEN ═══ */}
      <section ref={setSectionRef(3)} className="ft-section bg-[#050505] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-[1]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/15 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/15 to-transparent" />
        </div>
        <div ref={reviewsAnim.ref} className="w-full relative z-[3]">
          <div className={`text-center mb-10 px-5 transition-all duration-1000 ${reviewsAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-[#d4af37] text-[#d4af37]" />)}
              </div>
              <span className="text-white/40 text-xs font-medium">5.0</span>
            </div>
            <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl">Omdömen</h2>
            <div className={`gold-line ${reviewsAnim.visible ? 'active' : ''}`} />
          </div>
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
        </div>
      </section>

      {/* ═══ 5. TJÄNSTER ═══ */}
      <section ref={setSectionRef(4)} className="ft-section bg-[#070707] flex items-center">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/10 to-transparent" />
        <div ref={servicesAnim.ref} className="w-full max-w-5xl mx-auto px-5 py-16">
          <div className={`text-center mb-14 transition-all duration-1000 ${servicesAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl">Tjänster</h2>
            <div className={`gold-line ${servicesAnim.visible ? 'active' : ''}`} />
          </div>
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

      {/* ═══ 6. CTA ═══ */}
      <section ref={setSectionRef(5)} className="ft-section bg-black">
        <div data-ft-bg className="ft-bg" style={{ backgroundImage: `url(${IMAGES.cta})` }} />
        <FtVideo src={VIDEOS.cta} poster={IMAGES.cta} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 z-[1]" />
        <div className="ft-vignette" />
        <div data-ft-flare className="anamorphic-flare-wrap">
          <div className="anamorphic-streak" style={{ top: '42%' }} />
          <div className="anamorphic-orb" style={{ top: 'calc(42% - 40px)', left: '62%' }} />
          <div className="anamorphic-orb secondary" style={{ top: 'calc(42% - 20px)', left: '38%' }} />
        </div>
        <GoldParticles count={6} />
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-center px-5">
          <div data-ft-content style={{ willChange: 'opacity, transform, filter' }}>
            <h2 className="hero-title text-5xl sm:text-7xl md:text-8xl lg:text-[10rem]">
              Boka
            </h2>
            <div className="gold-line active mx-auto" />
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
              <a href="tel:+46762149929"
                className="border border-[#d4af37]/40 text-[#d4af37] text-sm font-bold px-12 py-4 tracking-[0.2em] uppercase hover:bg-[#d4af37] hover:text-black transition-all duration-500 no-underline pulse-glow">
                076-214 99 29
              </a>
              <a href="https://maps.google.com/?q=Edsgatan+23+V%C3%A4nersborg" target="_blank" rel="noopener noreferrer"
                className="border border-white/15 text-white/50 text-sm font-bold px-12 py-4 tracking-[0.15em] uppercase hover:bg-white/10 hover:text-white transition-all duration-500 no-underline">
                Hitta Hit
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#030303] border-t border-white/[0.04] py-12 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
            <div>
              <p className="text-[#d4af37]/60 text-[9px] font-bold uppercase tracking-[0.4em] mb-3">Adress</p>
              <p className="text-white/60 text-sm">Edsgatan 23</p>
              <p className="text-white/30 text-sm">462 33 Vänersborg</p>
            </div>
            <div>
              <p className="text-[#d4af37]/60 text-[9px] font-bold uppercase tracking-[0.4em] mb-3">Öppettider</p>
              {hours.map(h => (
                <div key={h.day} className="flex justify-between max-w-[140px]">
                  <span className="text-white/30 text-sm">{h.day}</span>
                  <span className={`text-sm tabular-nums ${h.time === 'Stängt' ? 'text-white/15' : 'text-white/60'}`}>{h.time}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[#d4af37]/60 text-[9px] font-bold uppercase tracking-[0.4em] mb-3">Kontakt</p>
              <a href="tel:+46762149929" className="flex items-center gap-2 text-white/50 hover:text-[#d4af37] transition-colors text-sm no-underline">
                <Phone className="w-3.5 h-3.5" /> 076-214 99 29
              </a>
              <div className="flex items-center gap-2 mt-4">
                <a href="https://www.facebook.com/p/Gentlemens-Barbershop-100063546855196/" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 border border-white/[0.06] flex items-center justify-center hover:border-[#d4af37]/30 hover:text-[#d4af37] transition-all duration-500 text-white/20">
                  <FacebookIcon className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-8 h-8 border border-white/[0.06] flex items-center justify-center hover:border-[#d4af37]/30 hover:text-[#d4af37] transition-all duration-500 text-white/20">
                  <InstagramIcon className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.03] pt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors className="w-3 h-3 text-[#d4af37]/40" />
              <span className="text-white/20 text-xs font-playfair italic">Gentlemen's Barbershop</span>
            </div>
            <span className="text-white/10 text-[10px]">Vänersborg</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
