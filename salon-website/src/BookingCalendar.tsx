import { useState, useMemo, useCallback } from 'react'

/* ═══ Types ═══ */

interface Booking {
  id: string
  date: string       // YYYY-MM-DD
  time: string       // HH:MM
  service: string
  duration: number   // minutes
  email: string
  name: string
  createdAt: string
}

interface Service {
  name: string
  price: string
  duration: number
  icon: string
}

/* ═══ Config ═══ */

const SERVICES: Service[] = [
  { name: 'Herrklippning', price: '300 kr', duration: 30, icon: 'scissors' },
  { name: 'Skinfade', price: '350 kr', duration: 45, icon: 'blade' },
  { name: 'Skägg', price: '200 kr', duration: 20, icon: 'razor' },
  { name: 'Klippning + Skägg', price: '450 kr', duration: 60, icon: 'crown' },
  { name: 'Lyxbehandling Skägg', price: '299 kr', duration: 45, icon: 'diamond' },
  { name: 'Ansiktsbehandling', price: '470 kr', duration: 60, icon: 'drop' },
]

const OWNER_EMAIL = 'gentlemens@barbershop.se'

const SLOT_INTERVAL = 30

const OPENING_HOURS: Record<number, { open: number; close: number } | null> = {
  1: { open: 10, close: 18 },  // Monday
  2: { open: 10, close: 18 },
  3: { open: 10, close: 18 },
  4: { open: 10, close: 18 },
  5: { open: 10, close: 18 },  // Friday
  6: { open: 10, close: 15 },  // Saturday
  0: null,                      // Sunday - closed
}

const DAY_NAMES = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const DAY_NAMES_FULL = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

/* ═══ Helpers ═══ */

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function generateTimeSlots(dayOfWeek: number): string[] {
  const hours = OPENING_HOURS[dayOfWeek]
  if (!hours) return []
  const slots: string[] = []
  let minutes = hours.open * 60
  const end = hours.close * 60
  while (minutes < end) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    minutes += SLOT_INTERVAL
  }
  return slots
}

function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem('gentlemens_bookings')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveBookings(bookings: Booking[]) {
  localStorage.setItem('gentlemens_bookings', JSON.stringify(bookings))
}

function isSlotBooked(bookings: Booking[], date: string, time: string): boolean {
  return bookings.some(b => b.date === date && b.time === time)
}

function isSlotConflicting(bookings: Booking[], date: string, time: string, duration: number): boolean {
  const slotStart = timeToMinutes(time)
  const slotEnd = slotStart + duration
  return bookings
    .filter(b => b.date === date)
    .some(b => {
      const bStart = timeToMinutes(b.time)
      const bEnd = bStart + b.duration
      return slotStart < bEnd && slotEnd > bStart
    })
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function isSlotInPast(date: string, time: string): boolean {
  const now = new Date()
  const [y, mo, d] = date.split('-').map(Number)
  const [h, m] = time.split(':').map(Number)
  const slotTime = new Date(y, mo - 1, d, h, m)
  return slotTime <= now
}

function fitsBeforeClose(dayOfWeek: number, time: string, duration: number): boolean {
  const hours = OPENING_HOURS[dayOfWeek]
  if (!hours) return false
  const slotEnd = timeToMinutes(time) + duration
  return slotEnd <= hours.close * 60
}

async function sendBookingEmails(booking: Booking) {
  const confirmationToCustomer = {
    to: booking.email,
    subject: `Bokningsbekräftelse - Gentlemen's Barbershop`,
    body: `Hej ${booking.name}!\n\nDin bokning är bekräftad:\n\nTjänst: ${booking.service}\nDatum: ${booking.date}\nTid: ${booking.time}\nLängd: ${booking.duration} min\n\nVälkommen till Gentlemen's Barbershop!\nEdsgatan 23, Vänersborg\nTel: 076-214 99 29`,
  }

  const notificationToOwner = {
    to: OWNER_EMAIL,
    subject: `Ny bokning: ${booking.service} - ${booking.date} ${booking.time}`,
    body: `Ny bokning mottagen:\n\nKund: ${booking.name}\nE-post: ${booking.email}\nTjänst: ${booking.service}\nDatum: ${booking.date}\nTid: ${booking.time}\nLängd: ${booking.duration} min`,
  }

  console.log('E-post till kund:', confirmationToCustomer)
  console.log('E-post till ägare:', notificationToOwner)

  // TODO: Connect to email service (EmailJS, SendGrid, etc.)
  // Example with EmailJS:
  // await emailjs.send(SERVICE_ID, TEMPLATE_ID, { ...params }, PUBLIC_KEY)
  return { customerEmail: confirmationToCustomer, ownerEmail: notificationToOwner }
}

/* ═══ Subcomponents ═══ */

function ServiceSelector({ selected, onSelect }: { selected: Service | null; onSelect: (s: Service) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {SERVICES.map(s => (
        <button
          key={s.name}
          onClick={() => onSelect(s)}
          className={`text-left p-4 border transition-all duration-300 cursor-pointer bg-transparent ${
            selected?.name === s.name
              ? 'border-[#d4af37]/60 bg-[#d4af37]/5'
              : 'border-white/[0.08] hover:border-[#d4af37]/25'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/80 text-sm font-semibold">{s.name}</span>
            <span className="text-[#d4af37] text-sm font-bold tabular-nums">{s.price}</span>
          </div>
          <span className="text-white/30 text-xs">{s.duration} min</span>
        </button>
      ))}
    </div>
  )
}

function WeekNav({ weekStart, onPrev, onNext }: { weekStart: Date; onPrev: () => void; onNext: () => void }) {
  const weekEnd = addDays(weekStart, 6)
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`
  const canGoPrev = weekStart > getMonday(new Date())

  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className={`text-xs uppercase tracking-[0.2em] px-4 py-2 border transition-all duration-300 bg-transparent cursor-pointer ${
          canGoPrev
            ? 'border-white/10 text-white/50 hover:border-[#d4af37]/30 hover:text-[#d4af37]'
            : 'border-white/5 text-white/15 cursor-not-allowed'
        }`}
      >
        &larr; Förra
      </button>
      <span className="text-white/60 text-sm font-medium tabular-nums">
        {fmt(weekStart)} — {fmt(weekEnd)}
      </span>
      <button
        onClick={onNext}
        className="text-xs uppercase tracking-[0.2em] px-4 py-2 border border-white/10 text-white/50 hover:border-[#d4af37]/30 hover:text-[#d4af37] transition-all duration-300 bg-transparent cursor-pointer"
      >
        Nästa &rarr;
      </button>
    </div>
  )
}

function CalendarGrid({
  weekStart,
  bookings,
  selectedService,
  onSlotClick,
}: {
  weekStart: Date
  bookings: Booking[]
  selectedService: Service | null
  onSlotClick: (date: string, time: string) => void
}) {
  const allTimeSlots = useMemo(() => {
    const allSlots = new Set<string>()
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      const dow = d.getDay()
      generateTimeSlots(dow).forEach(s => allSlots.add(s))
    }
    return [...allSlots].sort()
  }, [weekStart])

  const today = formatDate(new Date())

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1">
          <div />
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i)
            const dateStr = formatDate(d)
            const isToday = dateStr === today
            return (
              <div
                key={i}
                className={`text-center py-2 ${isToday ? 'bg-[#d4af37]/10 border border-[#d4af37]/20' : ''}`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isToday ? 'text-[#d4af37]' : 'text-white/40'}`}>
                  {DAY_NAMES[i]}
                </div>
                <div className={`text-sm font-semibold tabular-nums mt-0.5 ${isToday ? 'text-[#d4af37]' : 'text-white/70'}`}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Time slots */}
        <div className="space-y-[2px]">
          {allTimeSlots.map(time => (
            <div key={time} className="grid grid-cols-[60px_repeat(7,1fr)] gap-[2px]">
              <div className="flex items-center justify-end pr-3">
                <span className="text-white/25 text-[11px] font-medium tabular-nums">{time}</span>
              </div>
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(weekStart, i)
                const dateStr = formatDate(d)
                const dow = d.getDay()
                const daySlots = generateTimeSlots(dow)
                const hasSlot = daySlots.includes(time)

                if (!hasSlot) {
                  return <div key={i} className="h-10 bg-white/[0.01]" />
                }

                const past = isSlotInPast(dateStr, time)
                const booked = isSlotBooked(bookings, dateStr, time)
                const conflicting = selectedService
                  ? isSlotConflicting(bookings, dateStr, time, selectedService.duration)
                  : false
                const fitsSchedule = selectedService
                  ? fitsBeforeClose(dow, time, selectedService.duration)
                  : true
                const available = !past && !booked && !conflicting && fitsSchedule && !!selectedService

                let cellClass = 'h-10 transition-all duration-200 border cursor-pointer '
                let label = ''

                if (past) {
                  cellClass += 'bg-white/[0.02] border-white/[0.03] cursor-default'
                  label = ''
                } else if (booked) {
                  cellClass += 'bg-red-900/20 border-red-500/20 cursor-default'
                  label = 'Bokad'
                } else if (!selectedService) {
                  cellClass += 'bg-white/[0.03] border-white/[0.05] cursor-default'
                } else if (conflicting || !fitsSchedule) {
                  cellClass += 'bg-white/[0.02] border-white/[0.04] cursor-default'
                } else {
                  cellClass += 'bg-emerald-900/15 border-emerald-500/20 hover:bg-emerald-900/30 hover:border-emerald-500/40'
                  label = 'Ledig'
                }

                return (
                  <button
                    key={i}
                    disabled={!available}
                    onClick={() => available ? onSlotClick(dateStr, time) : undefined}
                    className={`${cellClass} flex items-center justify-center`}
                  >
                    {booked && (
                      <span className="text-red-400/60 text-[9px] font-bold uppercase tracking-wider">{label}</span>
                    )}
                    {available && (
                      <span className="text-emerald-400/50 text-[9px] font-bold uppercase tracking-wider">{label}</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-900/30 border border-emerald-500/30" />
            <span className="text-white/40 text-[10px] uppercase tracking-wider">Ledig</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-900/30 border border-red-500/30" />
            <span className="text-white/40 text-[10px] uppercase tracking-wider">Bokad</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white/[0.02] border border-white/[0.05]" />
            <span className="text-white/40 text-[10px] uppercase tracking-wider">Ej tillgänglig</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function BookingForm({
  date,
  time,
  service,
  onConfirm,
  onCancel,
}: {
  date: string
  time: string
  service: Service
  onConfirm: (name: string, email: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const dayIndex = new Date(date).getDay()
  const dayName = DAY_NAMES_FULL[dayIndex === 0 ? 6 : dayIndex - 1]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Ange ditt namn')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ange en giltig e-postadress')
      return
    }

    onConfirm(name.trim(), email.trim())
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative bg-[#0e0e0e] border border-[#d4af37]/20 p-6 sm:p-8 max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors bg-transparent border-none cursor-pointer text-xl"
        >
          &times;
        </button>

        <h3 className="text-white text-lg font-bold uppercase tracking-[0.1em] mb-1">Bekräfta bokning</h3>
        <div className="w-12 h-px bg-[#d4af37]/40 mb-6" />

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
            <span className="text-white/40 text-sm">Tjänst</span>
            <span className="text-white/80 text-sm font-semibold">{service.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
            <span className="text-white/40 text-sm">Pris</span>
            <span className="text-[#d4af37] text-sm font-bold">{service.price}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
            <span className="text-white/40 text-sm">Dag</span>
            <span className="text-white/80 text-sm">{dayName} {date}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
            <span className="text-white/40 text-sm">Tid</span>
            <span className="text-white/80 text-sm font-semibold tabular-nums">{time}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
            <span className="text-white/40 text-sm">Längd</span>
            <span className="text-white/80 text-sm">{service.duration} min</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
              Ditt namn
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Förnamn Efternamn"
              className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-sm px-4 py-3 outline-none focus:border-[#d4af37]/40 transition-colors placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
              E-postadress
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="din@email.se"
              className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-sm px-4 py-3 outline-none focus:border-[#d4af37]/40 transition-colors placeholder:text-white/20"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-[#d4af37] text-black text-xs font-bold uppercase tracking-[0.2em] py-4 hover:bg-[#b8960b] transition-colors cursor-pointer border-none"
          >
            Boka Nu
          </button>
        </form>
      </div>
    </div>
  )
}

function BookingConfirmation({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const dayIndex = new Date(booking.date).getDay()
  const dayName = DAY_NAMES_FULL[dayIndex === 0 ? 6 : dayIndex - 1]

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative bg-[#0e0e0e] border border-[#d4af37]/20 p-6 sm:p-8 max-w-md w-full text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-900/20 border border-emerald-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h3 className="text-white text-lg font-bold uppercase tracking-[0.1em] mb-2">Bokning bekräftad!</h3>
        <p className="text-white/40 text-sm mb-6">
          En bekräftelse har skickats till <span className="text-[#d4af37]">{booking.email}</span>
        </p>

        <div className="space-y-2 mb-6 text-left bg-white/[0.02] border border-white/[0.06] p-4">
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">Tjänst</span>
            <span className="text-white/80 text-sm font-semibold">{booking.service}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">Datum</span>
            <span className="text-white/80 text-sm">{dayName} {booking.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">Tid</span>
            <span className="text-white/80 text-sm font-semibold tabular-nums">{booking.time}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold uppercase tracking-[0.2em] px-8 py-3 hover:bg-[#d4af37] hover:text-black transition-all duration-500 bg-transparent cursor-pointer"
        >
          Stäng
        </button>
      </div>
    </div>
  )
}

/* ═══ Main Calendar Component ═══ */

export default function BookingCalendar() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings())
  const [pendingSlot, setPendingSlot] = useState<{ date: string; time: string } | null>(null)
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)

  const handleSlotClick = useCallback((date: string, time: string) => {
    setPendingSlot({ date, time })
  }, [])

  const handleConfirm = useCallback(async (name: string, email: string) => {
    if (!pendingSlot || !selectedService) return

    if (isSlotConflicting(bookings, pendingSlot.date, pendingSlot.time, selectedService.duration)) {
      alert('Denna tid har precis blivit bokad. Välj en annan tid.')
      setPendingSlot(null)
      return
    }

    const booking: Booking = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: pendingSlot.date,
      time: pendingSlot.time,
      service: selectedService.name,
      duration: selectedService.duration,
      email,
      name,
      createdAt: new Date().toISOString(),
    }

    const updated = [...bookings, booking]
    setBookings(updated)
    saveBookings(updated)
    setPendingSlot(null)
    setConfirmedBooking(booking)

    await sendBookingEmails(booking)
  }, [pendingSlot, selectedService, bookings])

  return (
    <section id="booking" className="relative bg-[#0a0a0a] py-24 sm:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/15 to-transparent" />

      <div className="w-full max-w-6xl mx-auto px-6 sm:px-10">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="section-label mb-3">Boka Online</p>
          <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl mb-3">Boka Din Tid</h2>
          <div className="gold-line active" />
          <p className="text-white/40 text-sm mt-4 max-w-lg mx-auto">
            Välj en tjänst, sedan en ledig tid i kalendern. Du behöver ange din e-postadress för att bekräfta.
          </p>
        </div>

        {/* Step 1: Service */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 flex items-center justify-center border border-[#d4af37]/30 text-[#d4af37] text-xs font-bold">1</span>
            <h3 className="text-white/70 text-sm font-bold uppercase tracking-[0.15em]">Välj tjänst</h3>
          </div>
          <ServiceSelector selected={selectedService} onSelect={setSelectedService} />
        </div>

        {/* Step 2: Calendar */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-7 h-7 flex items-center justify-center border text-xs font-bold ${
              selectedService ? 'border-[#d4af37]/30 text-[#d4af37]' : 'border-white/10 text-white/20'
            }`}>2</span>
            <h3 className={`text-sm font-bold uppercase tracking-[0.15em] ${
              selectedService ? 'text-white/70' : 'text-white/20'
            }`}>Välj tid</h3>
            {!selectedService && (
              <span className="text-white/20 text-xs italic ml-2">Välj en tjänst först</span>
            )}
          </div>

          <WeekNav
            weekStart={weekStart}
            onPrev={() => setWeekStart(prev => addDays(prev, -7))}
            onNext={() => setWeekStart(prev => addDays(prev, 7))}
          />

          <CalendarGrid
            weekStart={weekStart}
            bookings={bookings}
            selectedService={selectedService}
            onSlotClick={handleSlotClick}
          />
        </div>
      </div>

      {/* Booking form modal */}
      {pendingSlot && selectedService && (
        <BookingForm
          date={pendingSlot.date}
          time={pendingSlot.time}
          service={selectedService}
          onConfirm={handleConfirm}
          onCancel={() => setPendingSlot(null)}
        />
      )}

      {/* Confirmation modal */}
      {confirmedBooking && (
        <BookingConfirmation
          booking={confirmedBooking}
          onClose={() => setConfirmedBooking(null)}
        />
      )}
    </section>
  )
}
