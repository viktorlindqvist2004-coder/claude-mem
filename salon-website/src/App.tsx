import { useRef, useState, useEffect, useCallback } from 'react'
import { Scissors, Star, Clock, MapPin, Phone, ChevronDown, Menu, X } from 'lucide-react'

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
import './App.css'

const BG_IMAGE_1 = 'https://images.unsplash.com/photo-1585747860019-8901a572253d?w=1920&q=85&auto=format'
const BG_IMAGE_2 = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&q=85&auto=format'
const SPOTLIGHT_R = 280

function RevealLayer({ image, cursorX, cursorY }: { image: string; cursorX: number; cursorY: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const reveal = revealRef.current
    if (!canvas || !reveal) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const grad = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, SPOTLIGHT_R)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.4, 'rgba(255,255,255,1)')
    grad.addColorStop(0.6, 'rgba(255,255,255,0.75)')
    grad.addColorStop(0.75, 'rgba(255,255,255,0.4)')
    grad.addColorStop(0.88, 'rgba(255,255,255,0.12)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cursorX, cursorY, SPOTLIGHT_R, 0, Math.PI * 2)
    ctx.fill()

    const dataUrl = canvas.toDataURL()
    reveal.style.maskImage = `url(${dataUrl})`
    reveal.style.webkitMaskImage = `url(${dataUrl})`
    reveal.style.maskSize = '100% 100%'
    reveal.style.webkitMaskSize = '100% 100%'
  }, [cursorX, cursorY])

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ display: 'none' }} />
      <div
        ref={revealRef}
        className="absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
        style={{ backgroundImage: `url(${image})` }}
      />
    </>
  )
}

function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}

const services = [
  { name: 'Herrklippning', price: '530 kr', duration: '30 min', desc: 'Precision herrklippning med konsultation och styling' },
  { name: 'Skinfade', price: '550 kr', duration: '45 min', desc: 'Skarpt skinfade med sömlös övergång' },
  { name: 'Skägg', price: '400 kr', duration: '30 min', desc: 'Skäggtrimning, formning och vård med varma handdukar' },
  { name: 'Klippning + Skägg', price: '850 kr', duration: '60 min', desc: 'Komplett herrklippning och skäggvård i en behandling' },
  { name: 'Barn (upp till 11 år)', price: '300 kr', duration: '20 min', desc: 'Barnklippning i en avslappnad miljö' },
  { name: 'Barn (upp till 15 år)', price: '400 kr', duration: '25 min', desc: 'Stilfull klippning för tonåringar' },
]

const reviews = [
  { name: 'Marcus L.', rating: 5, text: 'Bästa barberaren i Stockholm. Perfekt fade varje gång, otroligt trevlig stämning och professionell service.', date: '2 veckor sedan' },
  { name: 'Erik S.', rating: 5, text: 'Har provat många barberare men ingen slår Gentlemen\'s. Detaljnivån i deras arbete är på en helt annan nivå.', date: '1 månad sedan' },
  { name: 'Johan K.', rating: 5, text: 'Fantastisk upplevelse från start till slut. Känslan av att kliva in i salongen är som att resa tillbaka i tiden till klassisk herrfrisering.', date: '3 veckor sedan' },
  { name: 'David A.', rating: 5, text: 'Min go-to salong sedan två år tillbaka. Konsekvent kvalitet och de tar sig alltid tid att lyssna på vad man vill ha.', date: '1 vecka sedan' },
  { name: 'Alexander P.', rating: 5, text: 'Proffsigt bemötande och en riktigt snygg klippning. Rekommenderar starkt till alla som vill ha en premium-upplevelse.', date: '2 månader sedan' },
  { name: 'Oscar N.', rating: 5, text: 'Skäggtrimningen här är outstanding. Varma handdukar, precision och ren avslappning. Fem stjärnor varje gång.', date: '3 veckor sedan' },
]

const hours = [
  { day: 'Måndag', time: '09:00 – 18:00' },
  { day: 'Tisdag', time: '09:00 – 18:00' },
  { day: 'Onsdag', time: '09:00 – 18:00' },
  { day: 'Torsdag', time: '09:00 – 19:00' },
  { day: 'Fredag', time: '09:00 – 18:00' },
  { day: 'Lördag', time: '10:00 – 16:00' },
  { day: 'Söndag', time: 'Stängt' },
]

function App() {
  const mouse = useRef({ x: -999, y: -999 })
  const smooth = useRef({ x: -999, y: -999 })
  const rafRef = useRef<number>(0)
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('Hem')

  const servicesAnim = useScrollAnimation()
  const reviewsAnim = useScrollAnimation()
  const aboutAnim = useScrollAnimation()
  const hoursAnim = useScrollAnimation()
  const ctaAnim = useScrollAnimation()

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMove)

    const loop = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1
      setCursorPos({ x: smooth.current.x, y: smooth.current.y })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }, [])

  const navItems = [
    { label: 'Hem', id: 'hero' },
    { label: 'Tjänster', id: 'services' },
    { label: 'Omdömen', id: 'reviews' },
    { label: 'Om Oss', id: 'about' },
    { label: 'Kontakt', id: 'contact' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] tracking-[-0.02em]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
        <button onClick={() => scrollTo('hero')} className="flex items-center gap-2.5 group cursor-pointer bg-transparent border-none">
          <Scissors className="w-7 h-7 text-[#d4af37] transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-white text-2xl font-playfair italic tracking-wide">Gentlemen's</span>
        </button>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-2 py-2 items-center gap-1">
          {navItems.map(item => (
            <button
              key={item.label}
              onClick={() => { setActiveNav(item.label); scrollTo(item.id) }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer border-none ${
                activeNav === item.label
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <a
          href="https://www.bokadirekt.se/places/gentlemens-barbershop-47451"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:block bg-[#d4af37] text-[#0a0a0a] text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#f5e6a3] transition-all duration-300 hover:scale-105 no-underline"
        >
          Boka Nu
        </a>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white bg-transparent border-none cursor-pointer p-2"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-[99] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-6 transition-all duration-500 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {navItems.map(item => (
          <button
            key={item.label}
            onClick={() => { setActiveNav(item.label); scrollTo(item.id) }}
            className="text-white text-2xl font-light hover:text-[#d4af37] transition-colors duration-300 bg-transparent border-none cursor-pointer"
          >
            {item.label}
          </button>
        ))}
        <a
          href="https://www.bokadirekt.se/places/gentlemens-barbershop-47451"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 bg-[#d4af37] text-[#0a0a0a] text-lg font-semibold px-8 py-3 rounded-full no-underline"
        >
          Boka Nu
        </a>
      </div>

      {/* Hero Section */}
      <section id="hero" className="relative w-full overflow-hidden h-screen bg-black" style={{ height: '100dvh' }}>
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat z-10 hero-zoom"
          style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
        />

        <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />

        <RevealLayer image={BG_IMAGE_2} cursorX={cursorPos.x} cursorY={cursorPos.y} />

        <div className="absolute top-[18%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none z-50">
          <div className="hero-anim hero-reveal" style={{ animationDelay: '0.15s' }}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <Scissors className="w-3.5 h-3.5 text-[#d4af37]" />
              <span className="text-white/90 text-xs font-medium uppercase tracking-[0.2em]">Est. Stockholm</span>
            </div>
          </div>
          <h1 className="text-white leading-[0.95]">
            <span className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl lg:text-9xl hero-anim hero-reveal" style={{ letterSpacing: '-0.05em', animationDelay: '0.25s' }}>
              Gentlemen's
            </span>
            <span className="block font-light text-4xl sm:text-6xl md:text-7xl lg:text-8xl -mt-1 hero-anim hero-reveal" style={{ letterSpacing: '-0.06em', animationDelay: '0.42s' }}>
              Barber Shop
            </span>
          </h1>
          <p className="hero-anim hero-fade text-white/60 text-sm sm:text-base mt-6 max-w-md" style={{ animationDelay: '0.6s' }}>
            Klassisk herrfrisering i hjärtat av Stockholm
          </p>
        </div>

        <div className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 hero-anim hero-fade" style={{ animationDelay: '0.7s' }}>
          <div className="flex items-center gap-1.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-[#d4af37] text-[#d4af37]" />
            ))}
            <span className="text-white/60 text-xs ml-1">4.9 / 5</span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            Över 400 femstjärniga omdömen. Stockholms mest betrodda barberare sedan dag ett.
          </p>
        </div>

        <div className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[280px] flex flex-col items-start gap-4 sm:gap-5 z-50 hero-anim hero-fade" style={{ animationDelay: '0.85s' }}>
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
            Precision, tradition och stil. Vi skapar skräddarsydda klippningar och skäggvård i en autentisk barbershop-miljö.
          </p>
          <a
            href="https://www.bokadirekt.se/places/gentlemens-barbershop-47451"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#d4af37] hover:bg-[#f5e6a3] text-[#0a0a0a] text-sm font-semibold px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#d4af37]/30 no-underline inline-flex items-center gap-2"
          >
            <Scissors className="w-4 h-4" />
            Boka Din Tid
          </a>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 hidden sm:flex flex-col items-center gap-2 hero-anim hero-fade" style={{ animationDelay: '1.2s' }}>
          <span className="text-white/40 text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <ChevronDown className="w-4 h-4 text-white/40 animate-bounce" />
        </div>
      </section>

      {/* Ticker Strip */}
      <div className="relative w-full bg-[#d4af37] py-3 overflow-hidden z-10">
        <div className="flex whitespace-nowrap" style={{ animation: 'ticker 20s linear infinite' }}>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-8 pr-8">
              {['PRECISION', 'TRADITION', 'STIL', 'KVALITET', 'HANTVERK', 'GENTLEMEN\'S', 'BARBER SHOP', 'STOCKHOLM'].map((word, j) => (
                <span key={j} className="flex items-center gap-8">
                  <span className="text-[#0a0a0a] text-xs font-bold tracking-[0.3em]">{word}</span>
                  <Scissors className="w-3 h-3 text-[#0a0a0a]/50 rotate-45" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Services Section */}
      <section id="services" className="relative py-24 sm:py-32 px-5 bg-[#0a0a0a]">
        <div ref={servicesAnim.ref} className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-1000 ${servicesAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-[#d4af37] text-xs font-semibold uppercase tracking-[0.3em] mb-4 block">Våra Tjänster</span>
            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-playfair italic" style={{ letterSpacing: '-0.04em' }}>
              Hantverk i varje klipp
            </h2>
            <div className="w-16 h-[1px] bg-[#d4af37] mx-auto mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service, i) => (
              <div
                key={service.name}
                className={`glass-card rounded-2xl p-6 sm:p-8 hover:bg-white/10 transition-all duration-500 hover:-translate-y-1 group cursor-default ${servicesAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: servicesAnim.isVisible ? `${i * 100}ms` : '0ms' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-white text-lg font-medium">{service.name}</h3>
                  <span className="text-[#d4af37] text-xl font-playfair italic">{service.price}</span>
                </div>
                <p className="text-white/50 text-sm leading-relaxed mb-4">{service.desc}</p>
                <div className="flex items-center gap-2 text-white/30 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{service.duration}</span>
                </div>
                <div className="w-0 group-hover:w-full h-[1px] bg-gradient-to-r from-[#d4af37] to-transparent transition-all duration-700 mt-5" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="relative py-24 sm:py-32 px-5 bg-[#0f0f0f]">
        <div ref={reviewsAnim.ref} className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-1000 ${reviewsAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-[#d4af37] text-xs font-semibold uppercase tracking-[0.3em] mb-4 block">Omdömen</span>
            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-playfair italic" style={{ letterSpacing: '-0.04em' }}>
              Vad våra kunder säger
            </h2>
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#d4af37] text-[#d4af37]" />
                ))}
              </div>
              <span className="text-white/60 text-sm">4.9 av 5 — 427+ omdömen</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((review, i) => (
              <div
                key={review.name}
                className={`glass-card rounded-2xl p-6 sm:p-8 hover:bg-white/10 transition-all duration-500 hover:-translate-y-1 ${reviewsAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: reviewsAnim.isVisible ? `${i * 120}ms` : '0ms' }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-[#d4af37] text-[#d4af37]" />
                  ))}
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-5 font-light italic">"{review.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center">
                      <span className="text-[#d4af37] text-xs font-semibold">{review.name.charAt(0)}</span>
                    </div>
                    <span className="text-white text-sm font-medium">{review.name}</span>
                  </div>
                  <span className="text-white/30 text-xs">{review.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-24 sm:py-32 px-5 bg-[#0a0a0a] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div ref={aboutAnim.ref} className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className={`transition-all duration-1000 ${aboutAnim.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16'}`}>
              <span className="text-[#d4af37] text-xs font-semibold uppercase tracking-[0.3em] mb-4 block">Om Oss</span>
              <h2 className="text-white text-4xl sm:text-5xl font-playfair italic mb-6" style={{ letterSpacing: '-0.04em' }}>
                Mer än en klippning
              </h2>
              <div className="w-16 h-[1px] bg-[#d4af37] mb-8" />
              <p className="text-white/70 leading-relaxed mb-6">
                Gentlemen's Barber Shop är inte bara en frisörsalong — det är en upplevelse.
                Beläget på Kungsholmen i Stockholm erbjuder vi klassisk herrfrisering med moderna tekniker
                i en autentisk och avslappnad miljö.
              </p>
              <p className="text-white/70 leading-relaxed mb-8">
                Våra barberare är utbildade mästare som kombinerar traditionellt hantverk med dagens trender.
                Varje besök börjar med en konsultation för att säkerställa att du får precis den look du vill ha.
              </p>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { value: '427+', label: 'Omdömen' },
                  { value: '4.9', label: 'Betyg' },
                  { value: '100%', label: 'Passion' },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="text-[#d4af37] text-2xl sm:text-3xl font-playfair italic">{stat.value}</div>
                    <div className="text-white/40 text-xs uppercase tracking-[0.15em] mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`relative transition-all duration-1000 delay-300 ${aboutAnim.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-16'}`}>
              <div className="aspect-[4/5] rounded-2xl overflow-hidden relative">
                <img
                  src={BG_IMAGE_1}
                  alt="Gentlemen's Barber Shop interiör"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-6 -left-6 glass-card rounded-xl p-5 flex items-center gap-4" style={{ animation: 'float 4s ease-in-out infinite' }}>
                <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-[#0a0a0a]" />
                </div>
                <div>
                  <div className="text-white text-sm font-medium">Premium Barberare</div>
                  <div className="text-white/50 text-xs">Kungsholmen, Stockholm</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hours & Contact Section */}
      <section id="contact" className="relative py-24 sm:py-32 px-5 bg-[#0f0f0f]">
        <div ref={hoursAnim.ref} className="max-w-6xl mx-auto">
          <div className={`text-center mb-16 transition-all duration-1000 ${hoursAnim.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <span className="text-[#d4af37] text-xs font-semibold uppercase tracking-[0.3em] mb-4 block">Hitta Oss</span>
            <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-playfair italic" style={{ letterSpacing: '-0.04em' }}>
              Välkommen in
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Opening Hours */}
            <div className={`glass-card rounded-2xl p-8 sm:p-10 transition-all duration-1000 ${hoursAnim.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16'}`}>
              <div className="flex items-center gap-3 mb-8">
                <Clock className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-white text-xl font-medium">Öppettider</h3>
              </div>
              <div className="space-y-4">
                {hours.map(h => (
                  <div key={h.day} className="flex items-center justify-between py-2 border-b border-white/5 last:border-none">
                    <span className="text-white/70 text-sm">{h.day}</span>
                    <span className={`text-sm font-medium ${h.time === 'Stängt' ? 'text-white/30' : 'text-white'}`}>{h.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className={`glass-card rounded-2xl p-8 sm:p-10 transition-all duration-1000 delay-200 ${hoursAnim.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-16'}`}>
              <div className="flex items-center gap-3 mb-8">
                <MapPin className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-white text-xl font-medium">Kontakt</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#d4af37]/20 transition-colors">
                    <MapPin className="w-4 h-4 text-[#d4af37]" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">Adress</div>
                    <div className="text-white/50 text-sm mt-1">John Ericssonsgatan 18</div>
                    <div className="text-white/50 text-sm">112 22 Stockholm</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#d4af37]/20 transition-colors">
                    <Phone className="w-4 h-4 text-[#d4af37]" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">Telefon</div>
                    <a href="tel:+4686533302" className="text-white/50 text-sm mt-1 block hover:text-[#d4af37] transition-colors no-underline">
                      +46 8 653 33 02
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#d4af37]/20 transition-colors">
                    <Scissors className="w-4 h-4 text-[#d4af37]" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">E-post</div>
                    <a href="mailto:gentlemen.barber@hotmail.com" className="text-white/50 text-sm mt-1 block hover:text-[#d4af37] transition-colors no-underline">
                      gentlemen.barber@hotmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <a href="https://www.instagram.com/gentlemen.barber/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#d4af37]/20 transition-all duration-300 group">
                    <InstagramIcon className="w-4 h-4 text-white/50 group-hover:text-[#d4af37] transition-colors" />
                  </a>
                  <a href="https://www.facebook.com/barber.gentlemen/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#d4af37]/20 transition-all duration-300 group">
                    <FacebookIcon className="w-4 h-4 text-white/50 group-hover:text-[#d4af37] transition-colors" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 sm:py-32 px-5 bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23d4af37%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div ref={ctaAnim.ref} className={`max-w-3xl mx-auto text-center relative z-10 transition-all duration-1000 ${ctaAnim.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <Scissors className="w-10 h-10 text-[#d4af37] mx-auto mb-6" style={{ animation: 'float 3s ease-in-out infinite' }} />
          <h2 className="text-white text-4xl sm:text-5xl md:text-6xl font-playfair italic mb-6" style={{ letterSpacing: '-0.04em' }}>
            Redo för din nya look?
          </h2>
          <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Boka din tid idag och upplev skillnaden med en riktig barberare.
            Vi ser fram emot att välkomna dig.
          </p>
          <a
            href="https://www.bokadirekt.se/places/gentlemens-barbershop-47451"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#d4af37] hover:bg-[#f5e6a3] text-[#0a0a0a] text-base font-semibold px-10 py-4 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 no-underline"
            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
          >
            <Scissors className="w-5 h-5" />
            Boka Din Tid Nu
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050505] border-t border-white/5 py-12 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <Scissors className="w-5 h-5 text-[#d4af37]" />
              <span className="text-white text-lg font-playfair italic">Gentlemen's</span>
            </div>
            <p className="text-white/30 text-xs text-center">
              Gentlemen's Barber Shop — John Ericssonsgatan 18, Stockholm
            </p>
            <div className="flex items-center gap-3">
              <a href="https://www.instagram.com/gentlemen.barber/" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#d4af37] transition-colors">
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a href="https://www.facebook.com/barber.gentlemen/" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#d4af37] transition-colors">
                <FacebookIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
