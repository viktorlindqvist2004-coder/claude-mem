import { useRef, useState, useEffect, useCallback } from 'react'
import { Scissors, Star, Phone, Menu, X } from 'lucide-react'
import './App.css'

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><circle cx="12" cy="12" r="5"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.51"/>
  </svg>
)

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.15V11.7a4.83 4.83 0 01-3.77-1.24V6.69h3.77z"/>
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
  inside: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&q=85&auto=format',
  chairs: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1920&q=85&auto=format',
  craft: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1920&q=85&auto=format',
  result: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1920&q=85&auto=format',
  community: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=1920&q=85&auto=format',
  cta: 'https://images.unsplash.com/photo-1587909209111-a8cc43812da8?w=1920&q=85&auto=format',
}

const VIDEOS = {
  hero: 'https://videos.pexels.com/video-files/4177561/4177561-uhd_2560_1440_25fps.mp4',
  craft: 'https://videos.pexels.com/video-files/3993394/3993394-hd_1920_1080_30fps.mp4',
  cta: 'https://videos.pexels.com/video-files/4718407/4718407-uhd_2560_1440_25fps.mp4',
}

const sections = [
  { id: 'hero', label: '' },
  { id: 'inside', label: 'Salongen' },
  { id: 'chairs', label: 'Miljön' },
  { id: 'craft', label: 'Hantverket' },
  { id: 'result', label: 'Resultatet' },
  { id: 'community', label: 'Gemenskapen' },
  { id: 'reviews', label: 'Omdömen' },
  { id: 'cta', label: 'Boka' },
  { id: 'services', label: 'Tjänster' },
  { id: 'contact', label: 'Kontakt' },
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
  { name: 'Thore T.', rating: 5, text: 'Mycket duktig! Bästa klippningen jag fått i Vänersborg. Professionellt bemötande och otroligt nöjd med resultatet.', source: 'Google' },
  { name: 'John', rating: 5, text: 'I looked homeless when I walked in — walked out looking sharp. These guys know exactly what they\'re doing. You will not be disappointed!', source: 'Google' },
  { name: 'Sifo', rating: 5, text: 'Letat efter en bra barbershop länge och hittade äntligen rätt. Riktigt nöjd med både klippning och bemötande. Kommer definitivt tillbaka!', source: 'Google' },
  { name: 'Erik S.', rating: 5, text: 'Har klippt mig här i över ett år nu. Proffsigt bemötande varje gång och resultatet blir alltid on point. Rekommenderas starkt!', source: 'Google' },
  { name: 'Andreas P.', rating: 5, text: 'Äntligen en riktig barbershop i Vänersborg! Klassisk känsla med modern precision. Min fade har aldrig sett bättre ut.', source: 'Google' },
  { name: 'Oscar F.', rating: 5, text: 'Stilren salong med grym atmosfär. Barberarna vet verkligen vad de gör. Man känner sig som en kung när man lämnar stolen.', source: 'Facebook' },
  { name: 'Marcus L.', rating: 5, text: 'Bästa barberaren i Vänersborg utan tvekan. Skinfaden blev perfekt och stämningen i salongen är alltid grym. Kommer alltid tillbaka!', source: 'Google' },
  { name: 'Simon R.', rating: 5, text: 'Gick dit första gången på rekommendation och har inte klippt mig någon annanstans sedan dess. Helt enkelt bäst i stan.', source: 'Google' },
]

const hours = [
  { day: 'Måndag', time: '10:00 – 18:00' },
  { day: 'Tisdag', time: '10:00 – 18:00' },
  { day: 'Onsdag', time: '10:00 – 18:00' },
  { day: 'Torsdag', time: '10:00 – 18:00' },
  { day: 'Fredag', time: '10:00 – 18:00' },
  { day: 'Lördag', time: '10:00 – 15:00' },
  { day: 'Söndag', time: 'Stängt' },
]

type Effect = 'zoom-in' | 'zoom-out' | '3d-tilt' | 'clip-reveal' | 'slide-left' | 'slide-right' | 'rotate-in' | 'split-reveal'

function GoldParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
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
        <div
          key={i}
          className="gold-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animation: `${p.anim} ${p.duration} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}

function VideoBackground({ src, poster, kenBurns, className = '' }: { src?: string; poster: string; kenBurns?: string; className?: string }) {
  const [videoFailed, setVideoFailed] = useState(false)

  if (!src || videoFailed) {
    return (
      <div className={`parallax-bg ${kenBurns || 'ken-burns-1'} ${className}`}
        style={{ backgroundImage: `url(${poster})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
    )
  }

  return (
    <video
      className={`parallax-bg video-bg ${className}`}
      autoPlay muted loop playsInline
      poster={poster}
      onError={() => setVideoFailed(true)}
    >
      <source src={src} type="video/mp4" />
    </video>
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

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onScroll = () => {
      const scrollTop = container.scrollTop
      const h = window.innerHeight
      const idx = Math.round(scrollTop / h)
      setActiveSection(idx)
      const totalHeight = container.scrollHeight - h
      setScrollProgress(totalHeight > 0 ? scrollTop / totalHeight : 0)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToSection = useCallback((idx: number) => {
    containerRef.current?.scrollTo({ top: idx * window.innerHeight, behavior: 'smooth' })
    setMobileMenuOpen(false)
  }, [])

  const servicesAnim = useInView()
  const contactAnim = useInView()
  const reviewsAnim = useInView()

  return (
    <div className="min-h-screen bg-[#070707] grain-overlay" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 h-[2px] bg-gradient-to-r from-[#d4af37] via-[#b8860b] to-[#d4af37] z-[200] transition-all duration-150"
        style={{ width: `${scrollProgress * 100}%` }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-6"
        style={{ background: 'linear-gradient(to bottom, rgba(7,7,7,0.7) 0%, transparent 100%)' }}>
        <button onClick={() => scrollToSection(0)} className="flex items-center gap-2 group cursor-pointer bg-transparent border-none">
          <Scissors className="w-5 h-5 text-[#d4af37] transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-white text-lg font-playfair italic tracking-wide">Gentlemen's</span>
          <span className="hidden sm:inline text-white/30 text-[9px] uppercase tracking-[0.25em] ml-1 mt-1">Barbershop</span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {['Salongen', 'Omdömen', 'Tjänster', 'Besök'].map((label) => (
            <button
              key={label}
              onClick={() => scrollToSection(
                label === 'Salongen' ? 1 : label === 'Omdömen' ? 6 : label === 'Tjänster' ? 8 : 9
              )}
              className="text-white/50 hover:text-[#d4af37] text-xs font-medium tracking-[0.15em] uppercase transition-all duration-300 bg-transparent border-none cursor-pointer"
            >
              {label}
            </button>
          ))}
          <a href="tel:+46762149929"
            className="bg-transparent border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold px-6 py-2.5 hover:bg-[#d4af37] hover:text-black transition-all duration-500 tracking-[0.15em] uppercase no-underline">
            Ring Oss
          </a>
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white bg-transparent border-none cursor-pointer p-2">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-[99] bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center gap-6 transition-all duration-700 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
        {sections.filter(s => s.label).map((s) => (
          <button key={s.id} onClick={() => scrollToSection(sections.indexOf(s))}
            className="text-white/80 text-xl font-light uppercase tracking-[0.25em] hover:text-[#d4af37] transition-all duration-300 bg-transparent border-none cursor-pointer">
            {s.label}
          </button>
        ))}
        <a href="tel:+46762149929"
          className="mt-6 border border-[#d4af37]/40 text-[#d4af37] text-base font-bold px-10 py-3 tracking-[0.2em] uppercase no-underline hover:bg-[#d4af37] hover:text-black transition-all duration-500">
          Ring 076-214 99 29
        </a>
      </div>

      {/* Dot Navigation */}
      <div className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-2.5">
        {sections.map((s, i) => (
          <button key={s.id} onClick={() => scrollToSection(i)}
            className="group relative bg-transparent border-none cursor-pointer p-1"
            title={s.label || 'Hem'}>
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${
              activeSection === i
                ? 'bg-[#d4af37] scale-[2] shadow-[0_0_12px_rgba(212,175,55,0.5)]'
                : 'bg-white/20 hover:bg-white/50 hover:scale-150'
            }`} />
            {s.label && (
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/0 group-hover:text-white/60 text-[9px] uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-300 pointer-events-none font-medium">
                {s.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ Snap Container ═══ */}
      <div ref={containerRef} className="snap-container">

        {/* HERO — Video background + particles */}
        <section className="snap-section bg-black lens-flare">
          <VideoBackground src={VIDEOS.hero} poster={IMAGES.hero} kenBurns="ken-burns-1" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70 z-[1]" />
          <GoldParticles />
          <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center text-center px-5">
            <div className={`stagger-children ${activeSection === 0 ? 'active' : ''}`}>
              <p className="section-label mb-5">Edsgatan 23 &nbsp;&middot;&nbsp; Vänersborg</p>
              <h1 className="hero-title text-6xl sm:text-8xl md:text-9xl lg:text-[11rem]">
                Gentlemen's
              </h1>
              <p className="font-playfair italic text-[#d4af37] text-2xl sm:text-3xl md:text-4xl mt-3"
                style={{ textShadow: '0 2px 15px rgba(0,0,0,0.6)' }}>
                Barbershop
              </p>
              <div className="gold-line active mx-auto mt-6" />
              <p className="text-white/45 text-sm sm:text-base mt-4 max-w-md tracking-wide">
                Där stil möter tradition sedan dag ett.
              </p>
              <a href="tel:+46762149929"
                className="inline-block mt-8 bg-transparent border border-[#d4af37]/50 text-[#d4af37] text-xs font-bold px-10 py-4 tracking-[0.25em] uppercase hover:bg-[#d4af37] hover:text-black transition-all duration-500 no-underline pulse-glow">
                Boka Din Tid
              </a>
            </div>
          </div>
        </section>

        {/* STIG IN — Zoom in + blur reveal */}
        <CinematicSection
          image={IMAGES.inside}
          label="Salongen"
          title="Stig In"
          desc="Lämna vardagen vid dörren. Här väntar en stol med ditt namn på — kaffe, lugn och precision."
          idx={1}
          activeSection={activeSection}
          effect="zoom-in"
          kenBurns="ken-burns-2"
          flare
        />

        {/* DÄR KUNGAR SITTER — Split reveal */}
        <CinematicSection
          image={IMAGES.chairs}
          label="Miljön"
          title={<>Där Kungar<br/>Sitter</>}
          desc="Vintage läder, mässing och mahogny. Värme, gott ljus och bra samtal. En salong byggd för ritualen — inte stressen."
          idx={2}
          activeSection={activeSection}
          align="right"
          effect="split-reveal"
          kenBurns="ken-burns-3"
        />

        {/* VARJE LINJE — Video + 3D tilt */}
        <CinematicSection
          image={IMAGES.craft}
          video={VIDEOS.craft}
          label="Hantverket"
          title={<>Varje Linje<br/>Med Precision</>}
          desc="Skinfades, klassiska nedtrappningar, skäggformning, varma handdukar och rakkniv. Varje detalj finjusterad av händer som gjort det tusentals gånger."
          idx={3}
          activeSection={activeSection}
          effect="3d-tilt"
          flare
        />

        {/* GÅ UT VASSARE — Rotate in */}
        <CinematicSection
          image={IMAGES.result}
          label="Resultatet"
          title={<>Gå Ut<br/>Vassare</>}
          desc="Du kom in trött. Du lämnar rakare, skarpare, starkare. Den känslan i spegeln — det är hela poängen."
          idx={4}
          activeSection={activeSection}
          align="right"
          effect="rotate-in"
          kenBurns="ken-burns-1"
        />

        {/* MER ÄN EN KLIPPNING — Clip reveal */}
        <CinematicSection
          image={IMAGES.community}
          label="Gemenskapen"
          title={<>Mer Än<br/>En Klippning</>}
          desc="Stammisar, förstagångsbesökare, hela kvarteret. Kliv in, slå dig ner och bli en del av gänget."
          idx={5}
          activeSection={activeSection}
          effect="clip-reveal"
          kenBurns="ken-burns-2"
        />

        {/* REVIEWS — Auto-scrolling ticker */}
        <section className="snap-section bg-[#070707] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-[1]">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent" />
          </div>
          <GoldParticles />
          <div ref={reviewsAnim.ref} className="w-full relative z-[3]">
            <div className={`text-center mb-10 px-5 transition-all duration-1000 ${reviewsAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <p className="section-label mb-3">Vad Våra Kunder Säger</p>
              <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl">Omdömen</h2>
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-[#d4af37] text-[#d4af37]" />)}
                </div>
                <span className="text-white/60 text-sm font-medium">5.0 på Google</span>
              </div>
              <div className={`gold-line ${reviewsAnim.visible ? 'active' : ''}`} />
            </div>

            {/* Ticker row 1 */}
            <div className="overflow-hidden mb-4">
              <div className="review-ticker" style={{ animationDuration: '50s' }}>
                {[...reviews, ...reviews].map((r, i) => (
                  <div key={i} className="review-card min-w-[320px] max-w-[380px] flex-shrink-0">
                    <p className="text-white/70 text-sm leading-relaxed mb-4 relative z-10">{r.text}</p>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/5 border border-[#d4af37]/20 flex items-center justify-center">
                          <span className="text-[#d4af37] text-xs font-bold">{r.name[0]}</span>
                        </div>
                        <div>
                          <p className="text-white/90 text-xs font-semibold">{r.name}</p>
                          <StarRating count={r.rating} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-widest">
                        {r.source === 'Google' ? <GoogleIcon className="w-3 h-3" /> : <FacebookIcon className="w-3 h-3" />}
                        {r.source}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticker row 2 — reversed */}
            <div className="overflow-hidden">
              <div className="review-ticker" style={{ animationDuration: '55s', animationDirection: 'reverse' }}>
                {[...reviews.slice(4), ...reviews.slice(0, 4), ...reviews.slice(4), ...reviews.slice(0, 4)].map((r, i) => (
                  <div key={i} className="review-card min-w-[320px] max-w-[380px] flex-shrink-0">
                    <p className="text-white/70 text-sm leading-relaxed mb-4 relative z-10">{r.text}</p>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/5 border border-[#d4af37]/20 flex items-center justify-center">
                          <span className="text-[#d4af37] text-xs font-bold">{r.name[0]}</span>
                        </div>
                        <div>
                          <p className="text-white/90 text-xs font-semibold">{r.name}</p>
                          <StarRating count={r.rating} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-widest">
                        {r.source === 'Google' ? <GoogleIcon className="w-3 h-3" /> : <FacebookIcon className="w-3 h-3" />}
                        {r.source}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA — Video + zoom out */}
        <section className="snap-section bg-black">
          <VideoBackground src={VIDEOS.cta} poster={IMAGES.cta} kenBurns="ken-burns-3" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/55 z-[1]" />
          <GoldParticles />
          <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center text-center px-5">
            <div className={`section-zoom-out ${activeSection === 7 ? 'active' : ''}`}>
              <h2 className="hero-title text-5xl sm:text-7xl md:text-8xl lg:text-9xl">
                Ta Din<br/>Plats
              </h2>
              <div className={`gold-line ${activeSection === 7 ? 'active' : ''}`} />
              <p className="text-white/50 text-sm mt-4 max-w-md mx-auto">Boka din tid — ring oss direkt eller besök salongen på Edsgatan 23.</p>
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
                <a href="tel:+46762149929"
                  className="border border-[#d4af37]/50 text-[#d4af37] text-sm font-bold px-10 py-4 tracking-[0.2em] uppercase hover:bg-[#d4af37] hover:text-black transition-all duration-500 no-underline"
                  style={{ animation: activeSection === 7 ? 'pulse-glow 3s ease-in-out infinite' : 'none' }}>
                  Boka Din Tid
                </a>
                <a href="https://maps.google.com/?q=Edsgatan+23+Vänersborg" target="_blank" rel="noopener noreferrer"
                  className="border border-white/20 text-white/70 text-sm font-bold px-10 py-4 tracking-[0.15em] uppercase hover:bg-white/10 hover:text-white transition-all duration-500 no-underline">
                  Hitta Hit
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES — Staggered cards, no emojis */}
        <section id="services" className="snap-section bg-[#070707] flex items-center">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/15 to-transparent" />
          <div ref={servicesAnim.ref} className="w-full max-w-6xl mx-auto px-5 py-16">
            <div className={`text-center mb-14 transition-all duration-1000 ${servicesAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <p className="section-label mb-3">Menyn</p>
              <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl">Tjänster &amp; Priser</h2>
              <p className="text-white/30 text-sm mt-4 max-w-md mx-auto tracking-wide">Walk-ins välkomna — bokning rekommenderas.</p>
              <div className={`gold-line ${servicesAnim.visible ? 'active' : ''}`} />
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children ${servicesAnim.visible ? 'active' : ''}`}>
              {services.map((s) => (
                <div key={s.name}
                  className="group border border-white/[0.06] hover:border-[#d4af37]/30 p-6 sm:p-8 transition-all duration-700 hover:bg-white/[0.02] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#d4af37]/0 group-hover:via-[#d4af37]/30 to-transparent transition-all duration-700" />
                  <div className="flex items-center gap-3 mb-4">
                    <ServiceIcon type={s.icon} />
                    <h3 className="text-white/90 text-sm font-bold uppercase tracking-[0.12em]">{s.name}</h3>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-1 h-px bg-gradient-to-r from-[#d4af37]/0 group-hover:from-[#d4af37]/40 to-transparent transition-all duration-1000" />
                    <span className="text-[#d4af37] text-lg font-bold ml-4 whitespace-nowrap tabular-nums">{s.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="snap-section bg-[#070707] flex items-center">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/15 to-transparent" />
          <div ref={contactAnim.ref} className="w-full max-w-6xl mx-auto px-5 py-16">
            <div className={`transition-all duration-1000 ${contactAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <p className="section-label mb-3">Besök Salongen</p>
              <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl mb-3">Kom Förbi</h2>
              <div className={`gold-line ${contactAnim.visible ? 'active' : ''} !mx-0`} style={{ margin: '0' }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
              <div className={`space-y-8 transition-all duration-1000 delay-200 ${contactAnim.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
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
                    <a href="#" className="w-9 h-9 border border-white/[0.08] flex items-center justify-center hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all duration-500 text-white/30 hover:bg-[#d4af37]/5">
                      <InstagramIcon className="w-4 h-4" />
                    </a>
                    <a href="#" className="w-9 h-9 border border-white/[0.08] flex items-center justify-center hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-all duration-500 text-white/30 hover:bg-[#d4af37]/5">
                      <TikTokIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <a href="tel:+46762149929"
                  className="inline-block border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold px-8 py-3.5 tracking-[0.2em] uppercase hover:bg-[#d4af37] hover:text-black transition-all duration-500 no-underline">
                  Boka Din Tid
                </a>
              </div>

              <div className={`transition-all duration-1000 delay-300 ${contactAnim.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
                <div className="w-full h-full min-h-[400px] bg-[#0c0c0c] border border-white/[0.06] overflow-hidden relative">
                  <iframe
                    title="Karta"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2126.5!2d12.3233!3d58.3808!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTjCsDIyJzUxLjAiTiAxMsKwMTknMjQuMCJF!5e0!3m2!1ssv!2sse!4v1"
                    className="w-full h-full min-h-[400px] border-0 grayscale invert opacity-70"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="absolute inset-0 border border-[#d4af37]/10 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-[#050505] border-t border-white/[0.04] py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="text-white/60 text-sm font-playfair italic">Gentlemen's Barbershop</span>
          </div>
          <p className="text-white/15 text-xs tracking-wide">Edsgatan 23, Vänersborg</p>
          <div className="flex items-center gap-2">
            <a href="https://www.facebook.com/p/Gentlemens-Barbershop-100063546855196/" target="_blank" rel="noopener noreferrer" className="text-white/15 hover:text-[#d4af37] transition-colors duration-500">
              <FacebookIcon className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="text-white/15 hover:text-[#d4af37] transition-colors duration-500">
              <InstagramIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function CinematicSection({ image, video, label, title, desc, idx, activeSection, align, flare, effect, kenBurns }: {
  image: string; video?: string; label: string; title: React.ReactNode; desc: string;
  idx: number; activeSection: number; align?: 'right'; flare?: boolean;
  effect: Effect; kenBurns?: string;
}) {
  const isActive = activeSection === idx
  const effectClass = `section-${effect}`

  return (
    <section className={`snap-section bg-black ${flare ? 'lens-flare' : ''}`}>
      <VideoBackground src={video} poster={image} kenBurns={kenBurns || 'ken-burns-1'}
        className={`section-clip-reveal ${isActive ? 'active' : ''}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/65 z-[1]" />
      <GoldParticles />
      <div className="absolute inset-0 z-[3] flex items-center px-6 sm:px-14 md:px-20">
        <div className={`max-w-2xl ${align === 'right' ? 'ml-auto text-right' : ''} ${effectClass} ${isActive ? 'active' : ''}`}>
          <div className={`stagger-children ${isActive ? 'active' : ''}`}>
            <p className="section-label mb-4">{label}</p>
            <h2 className="hero-title text-5xl sm:text-7xl md:text-8xl">{title}</h2>
            <div className={`gold-line ${isActive ? 'active' : ''} ${align === 'right' ? 'ml-auto mr-0' : 'mr-auto ml-0'}`}
              style={{ margin: align === 'right' ? '1.5rem 0 1.5rem auto' : '1.5rem auto 1.5rem 0' }} />
            <p className={`text-white/55 text-sm sm:text-base leading-relaxed max-w-lg ${align === 'right' ? 'ml-auto' : ''}`}>
              {desc}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default App
