import { useRef, useState, useEffect, useCallback } from 'react'
import { Scissors, Star, Clock, MapPin, Phone, Menu, X } from 'lucide-react'
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

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1585747860019-8901a572253d?w=1920&q=85&auto=format',
  inside: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1920&q=85&auto=format',
  chairs: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1920&q=85&auto=format',
  craft: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1920&q=85&auto=format',
  result: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1920&q=85&auto=format',
  community: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=1920&q=85&auto=format',
  cta: 'https://images.unsplash.com/photo-1587909209111-a8cc43812da8?w=1920&q=85&auto=format',
}

const sections = [
  { id: 'hero', label: '' },
  { id: 'inside', label: 'Salongen' },
  { id: 'chairs', label: 'Miljön' },
  { id: 'craft', label: 'Hantverket' },
  { id: 'result', label: 'Resultatet' },
  { id: 'community', label: 'Gemenskapen' },
  { id: 'cta', label: 'Boka' },
  { id: 'services', label: 'Tjänster' },
  { id: 'contact', label: 'Kontakt' },
]

const services = [
  { name: 'Herrklippning', price: '300 kr', icon: '✂️' },
  { name: 'Skinfade', price: '350 kr', icon: '💈' },
  { name: 'Skägg', price: '200 kr', icon: '🪒' },
  { name: 'Klippning + Skägg', price: '450 kr', icon: '👑' },
  { name: 'Lyxbehandling Skägg', price: '299 kr', icon: '✨' },
  { name: 'Ansiktsbehandling', price: '470 kr', icon: '💆' },
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

function useInView() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onScroll = () => {
      const scrollTop = container.scrollTop
      const h = window.innerHeight
      const idx = Math.round(scrollTop / h)
      setActiveSection(idx)
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

  return (
    <div className="min-h-screen bg-[#0a0a0a]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-6">
        <button onClick={() => scrollToSection(0)} className="flex items-center gap-2 group cursor-pointer bg-transparent border-none">
          <Scissors className="w-6 h-6 text-[#e8702a] transition-transform group-hover:rotate-45 duration-500" />
          <span className="text-white text-xl font-playfair italic tracking-wide">Gentlemen's</span>
          <span className="hidden sm:inline text-white/40 text-[10px] uppercase tracking-[0.2em] ml-1 mt-1">Barbershop</span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {['Salongen', 'Tjänster', 'Besök'].map((label, i) => (
            <button
              key={label}
              onClick={() => scrollToSection(label === 'Salongen' ? 1 : label === 'Tjänster' ? 7 : 8)}
              className="text-white/70 hover:text-white text-sm font-medium tracking-[0.1em] uppercase transition-colors duration-300 bg-transparent border-none cursor-pointer"
            >
              {label}
            </button>
          ))}
          <a
            href="https://www.gentlemens-barbershop.se/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#e8702a] text-white text-sm font-bold px-6 py-2.5 border border-[#e8702a] hover:bg-transparent hover:text-[#e8702a] transition-all duration-300 tracking-[0.15em] uppercase no-underline"
          >
            Boka Nu
          </a>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white bg-transparent border-none cursor-pointer p-2"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-[99] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 transition-all duration-500 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {sections.filter(s => s.label).map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(sections.indexOf(s))}
            className="text-white text-2xl font-light uppercase tracking-[0.2em] hover:text-[#e8702a] transition-colors duration-300 bg-transparent border-none cursor-pointer"
          >
            {s.label}
          </button>
        ))}
        <a href="https://www.gentlemens-barbershop.se/" target="_blank" rel="noopener noreferrer"
          className="mt-4 bg-[#e8702a] text-white text-lg font-bold px-8 py-3 tracking-[0.15em] uppercase no-underline">
          Boka Nu
        </a>
      </div>

      {/* Dot Navigation (right side) */}
      <div className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-3">
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(i)}
            className="group relative bg-transparent border-none cursor-pointer p-1"
            title={s.label || 'Hem'}
          >
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
              activeSection === i
                ? 'bg-[#e8702a] scale-150 shadow-[0_0_8px_rgba(232,112,42,0.6)]'
                : 'bg-white/30 hover:bg-white/60'
            }`} />
            {s.label && (
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/0 group-hover:text-white/70 text-[10px] uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-300 pointer-events-none">
                {s.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Snap Scroll Container */}
      <div ref={containerRef} className="snap-container">

        {/* SECTION 1: Hero */}
        <section className="snap-section bg-black">
          <div className="absolute inset-0 slow-zoom" style={{ backgroundImage: `url(${IMAGES.hero})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60 z-[1]" />
          <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center text-center px-5">
            <p className="section-label mb-4 anim-fade-up" style={{ animationDelay: '0.2s' }}>Edsgatan 23 &nbsp;&middot;&nbsp; Vänersborg</p>
            <h1 className="hero-title text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] anim-fade-up" style={{ animationDelay: '0.4s' }}>
              Gentlemen's
            </h1>
            <p className="font-playfair italic text-[#e8702a] text-2xl sm:text-3xl md:text-4xl mt-2 anim-fade-up" style={{ animationDelay: '0.6s', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              Barbershop
            </p>
            <p className="text-white/60 text-sm sm:text-base mt-6 max-w-md anim-fade-up" style={{ animationDelay: '0.8s' }}>
              Där stil möter tradition.
            </p>
            <a
              href="https://www.gentlemens-barbershop.se/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-bold px-8 py-3.5 tracking-[0.2em] uppercase transition-all hover:scale-[1.03] active:scale-95 no-underline anim-fade-up"
              style={{ animationDelay: '1s', animation: 'fadeInUp 1s cubic-bezier(0.16,1,0.3,1) forwards, pulse-glow 2.5s ease-in-out 2s infinite' }}
            >
              Boka Din Stol
            </a>
            <button onClick={() => scrollToSection(1)} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase tracking-[0.3em] bg-transparent border-none cursor-pointer anim-fade-up flex flex-col items-center gap-2" style={{ animationDelay: '1.4s' }}>
              Scrolla
              <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
            </button>
          </div>
        </section>

        {/* SECTION 2: Step Inside */}
        <FullSection
          image={IMAGES.inside}
          label="Salongen"
          title="Stig In"
          desc="Lämna vardagen vid dörren. Här väntar en stol med ditt namn på — kaffe, lugn och precision."
          idx={1}
          activeSection={activeSection}
          flare
        />

        {/* SECTION 3: Where Kings Sit */}
        <FullSection
          image={IMAGES.chairs}
          label="Miljön"
          title={<>Där Kungar<br/>Sitter</>}
          desc="Vintage läder, mässing och mahogny. Värme, gott ljus och bra samtal. En salong byggd för ritualen — inte stressen."
          idx={2}
          activeSection={activeSection}
          align="right"
        />

        {/* SECTION 4: Every Line Intentional */}
        <FullSection
          image={IMAGES.craft}
          label="Hantverket"
          title={<>Varje Linje<br/>Med Precision</>}
          desc="Skinfades, klassiska nedtrappningar, skäggformning, varma handdukar och rakkniv. Varje detalj finjusterad av händer som gjort det tusentals gånger."
          idx={3}
          activeSection={activeSection}
          flare
        />

        {/* SECTION 5: Walk Out Sharper */}
        <FullSection
          image={IMAGES.result}
          label="Resultatet"
          title={<>Gå Ut<br/>Vassare</>}
          desc="Du kom in trött. Du lämnar rakare, skarpare, starkare. Den känslan i spegeln — det är hela poängen."
          idx={4}
          activeSection={activeSection}
          align="right"
        />

        {/* SECTION 6: More Than a Cut */}
        <FullSection
          image={IMAGES.community}
          label="Gemenskapen"
          title={<>Mer Än<br/>En Klippning</>}
          desc="Stammisar, förstagångsbesökare, hela kvarteret. Kliv in, slå dig ner och bli en del av gänget."
          idx={5}
          activeSection={activeSection}
        />

        {/* SECTION 7: Take Your Throne (CTA) */}
        <section className="snap-section bg-black">
          <div className="absolute inset-0 slow-zoom" style={{ backgroundImage: `url(${IMAGES.cta})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/50 z-[1]" />
          <div className={`absolute inset-0 z-[2] flex flex-col items-center justify-center text-center px-5 transition-all duration-1000 ${activeSection === 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="hero-title text-5xl sm:text-7xl md:text-8xl lg:text-9xl">
              Ta Din<br/>Plats
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
              <a
                href="https://www.gentlemens-barbershop.se/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#e8702a] text-white text-sm font-bold px-10 py-4 tracking-[0.2em] uppercase hover:bg-[#d2611f] transition-all no-underline"
                style={{ animation: activeSection === 6 ? 'pulse-glow 2s ease-in-out infinite' : 'none' }}
              >
                Boka Nu
              </a>
              <a
                href="tel:+46762149929"
                className="border border-white/40 text-white text-sm font-bold px-10 py-4 tracking-[0.15em] uppercase hover:bg-white/10 transition-all no-underline"
              >
                Ring 076-214 99 29
              </a>
            </div>
          </div>
        </section>

        {/* SECTION 8: Services & Pricing (non-snap, regular scroll) */}
        <section id="services" className="snap-section bg-[#0a0a0a] flex items-center">
          <div ref={servicesAnim.ref} className="w-full max-w-6xl mx-auto px-5 py-16">
            <div className={`text-center mb-14 transition-all duration-1000 ${servicesAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <p className="section-label mb-3">Menyn</p>
              <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl">Tjänster &amp; Priser</h2>
              <p className="text-white/40 text-sm mt-4 max-w-md mx-auto">Walk-ins välkomna — bokning rekommenderas.</p>
              <div className="w-12 h-[2px] bg-[#e8702a] mx-auto mt-6" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((s, i) => (
                <div
                  key={s.name}
                  className={`group border border-white/10 hover:border-[#e8702a]/40 p-6 sm:p-8 transition-all duration-500 hover:bg-white/[0.03] ${servicesAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: servicesAnim.visible ? `${i * 80}ms` : '0ms' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{s.icon}</span>
                      <h3 className="text-white text-base font-bold uppercase tracking-[0.1em]">{s.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-0 group-hover:w-full h-[1px] bg-gradient-to-r from-[#e8702a]/60 to-transparent transition-all duration-700" />
                    <span className="text-[#e8702a] text-lg font-bold ml-4 whitespace-nowrap">{s.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 9: Visit / Contact */}
        <section id="contact" className="snap-section bg-[#0a0a0a] flex items-center">
          <div ref={contactAnim.ref} className="w-full max-w-6xl mx-auto px-5 py-16">
            <div className={`transition-all duration-1000 ${contactAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <p className="section-label mb-3">Besök Salongen</p>
              <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl mb-12">Kom Förbi</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Info */}
              <div className={`space-y-8 transition-all duration-1000 ${contactAnim.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
                <div>
                  <p className="text-[#e8702a] text-xs font-bold uppercase tracking-[0.3em] mb-3">Adress</p>
                  <p className="text-white text-lg font-medium">Edsgatan 23</p>
                  <p className="text-white/50">462 33 Vänersborg</p>
                </div>

                <div>
                  <p className="text-[#e8702a] text-xs font-bold uppercase tracking-[0.3em] mb-3">Öppettider</p>
                  <div className="space-y-2">
                    {hours.map(h => (
                      <div key={h.day} className="flex justify-between items-center py-1 border-b border-white/5 last:border-none max-w-sm">
                        <span className="text-white/60 text-sm">{h.day}</span>
                        <span className={`text-sm font-medium ${h.time === 'Stängt' ? 'text-white/25' : 'text-white'}`}>{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[#e8702a] text-xs font-bold uppercase tracking-[0.3em] mb-3">Kontakt</p>
                  <div className="space-y-2">
                    <a href="tel:+46762149929" className="flex items-center gap-3 text-white/70 hover:text-[#e8702a] transition-colors text-sm no-underline">
                      <Phone className="w-4 h-4" /> 076-214 99 29
                    </a>
                  </div>

                  <div className="flex items-center gap-3 mt-5">
                    <a href="https://www.facebook.com/p/Gentlemens-Barbershop-100063546855196/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-white/15 flex items-center justify-center hover:border-[#e8702a] hover:text-[#e8702a] transition-all duration-300 text-white/40">
                      <FacebookIcon className="w-4 h-4" />
                    </a>
                    <a href="#" className="w-9 h-9 border border-white/15 flex items-center justify-center hover:border-[#e8702a] hover:text-[#e8702a] transition-all duration-300 text-white/40">
                      <InstagramIcon className="w-4 h-4" />
                    </a>
                    <a href="#" className="w-9 h-9 border border-white/15 flex items-center justify-center hover:border-[#e8702a] hover:text-[#e8702a] transition-all duration-300 text-white/40">
                      <TikTokIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <a
                  href="https://www.gentlemens-barbershop.se/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#e8702a] text-white text-sm font-bold px-8 py-3.5 tracking-[0.2em] uppercase hover:bg-[#d2611f] transition-all no-underline"
                >
                  Boka Din Stol
                </a>
              </div>

              {/* Right: Map placeholder */}
              <div className={`transition-all duration-1000 delay-200 ${contactAnim.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
                <div className="w-full h-full min-h-[400px] bg-[#111] border border-white/10 rounded-sm overflow-hidden relative">
                  <iframe
                    title="Karta"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2126.5!2d12.3233!3d58.3808!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTjCsDIyJzUxLjAiTiAxMsKwMTknMjQuMCJF!5e0!3m2!1ssv!2sse!4v1"
                    className="w-full h-full min-h-[400px] border-0 grayscale invert opacity-80"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="absolute inset-0 border border-[#e8702a]/20 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Footer (after snap container) */}
      <footer className="bg-[#050505] border-t border-white/5 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#e8702a]" />
            <span className="text-white text-sm font-playfair italic">Gentlemen's Barbershop</span>
          </div>
          <p className="text-white/20 text-xs">Edsgatan 23, Vänersborg</p>
          <div className="flex items-center gap-3">
            <a href="https://www.facebook.com/p/Gentlemens-Barbershop-100063546855196/" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-[#e8702a] transition-colors">
              <FacebookIcon className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="text-white/20 hover:text-[#e8702a] transition-colors">
              <InstagramIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FullSection({ image, label, title, desc, idx, activeSection, align, flare }: {
  image: string; label: string; title: React.ReactNode; desc: string;
  idx: number; activeSection: number; align?: 'right'; flare?: boolean;
}) {
  const isActive = activeSection === idx

  return (
    <section className={`snap-section bg-black ${flare ? 'lens-flare' : ''}`}>
      <div className="absolute inset-0 slow-zoom" style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60 z-[1]" />
      <div className={`absolute inset-0 z-[3] flex items-center px-6 sm:px-14 md:px-20 transition-all duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`max-w-2xl ${align === 'right' ? 'ml-auto text-right' : ''}`}>
          <p className={`section-label mb-4 transition-all duration-700 delay-100 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {label}
          </p>
          <h2 className={`hero-title text-5xl sm:text-7xl md:text-8xl transition-all duration-700 delay-200 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {title}
          </h2>
          <p className={`text-white/70 text-sm sm:text-base leading-relaxed mt-6 max-w-lg ${align === 'right' ? 'ml-auto' : ''} transition-all duration-700 delay-400 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {desc}
          </p>
        </div>
      </div>
    </section>
  )
}

export default App
