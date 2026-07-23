import { useState, useEffect, useMemo, useCallback } from 'react'
import emailjs from '@emailjs/browser'

/* ═══ Types ═══ */

interface Booking {
  id: string
  date: string
  time: string
  service: string
  duration: number
  price: string
  email: string
  phone: string
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

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || ''
const EMAILJS_CUSTOMER_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID || ''
const EMAILJS_OWNER_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_OWNER_TEMPLATE_ID || ''
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''

const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || 'gentlemens@barbershop.se'

const SERVICES: Service[] = [
  { name: 'Herrklippning', price: '300 kr', duration: 30, icon: 'scissors' },
  { name: 'Skinfade', price: '350 kr', duration: 45, icon: 'blade' },
  { name: 'Skägg', price: '200 kr', duration: 20, icon: 'razor' },
  { name: 'Klippning + Skägg', price: '450 kr', duration: 60, icon: 'crown' },
  { name: 'Lyxbehandling Skägg', price: '299 kr', duration: 45, icon: 'diamond' },
  { name: 'Ansiktsbehandling', price: '470 kr', duration: 60, icon: 'drop' },
]

const SLOT_INTERVAL = 30
const BUFFER_MINUTES = 10
const MIN_ADVANCE_HOURS = 2
const MAX_ADVANCE_WEEKS = 4

const OPENING_HOURS: Record<number, { open: number; close: number } | null> = {
  1: { open: 10, close: 18 },
  2: { open: 10, close: 18 },
  3: { open: 10, close: 18 },
  4: { open: 10, close: 18 },
  5: { open: 10, close: 18 },
  6: { open: 10, close: 15 },
  0: null,
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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function generateTimeSlots(dayOfWeek: number): string[] {
  const hours = OPENING_HOURS[dayOfWeek]
  if (!hours) return []
  const slots: string[] = []
  let minutes = hours.open * 60
  const end = hours.close * 60
  while (minutes < end) {
    slots.push(minutesToTime(minutes))
    minutes += SLOT_INTERVAL
  }
  return slots
}

function getDayName(date: string): string {
  const d = new Date(date)
  const dow = d.getDay()
  return DAY_NAMES_FULL[dow === 0 ? 6 : dow - 1]
}

function formatSwedishDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m} ${y}`
}

function generateBookingId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

/* ═══ Booking storage ═══ */

function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem('gentlemens_bookings')
    if (!raw) return []
    const bookings: Booking[] = JSON.parse(raw)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 1)
    const active = bookings.filter(b => new Date(b.date) >= cutoff)
    if (active.length !== bookings.length) {
      localStorage.setItem('gentlemens_bookings', JSON.stringify(active))
    }
    return active
  } catch {
    return []
  }
}

function saveBookings(bookings: Booking[]) {
  localStorage.setItem('gentlemens_bookings', JSON.stringify(bookings))
}

/* ═══ Slot availability ═══ */

function isSlotConflicting(bookings: Booking[], date: string, time: string, duration: number): boolean {
  const slotStart = timeToMinutes(time)
  const slotEnd = slotStart + duration + BUFFER_MINUTES
  return bookings
    .filter(b => b.date === date)
    .some(b => {
      const bStart = timeToMinutes(b.time)
      const bEnd = bStart + b.duration + BUFFER_MINUTES
      return slotStart < bEnd && slotEnd > bStart
    })
}

function getBookingAt(bookings: Booking[], date: string, time: string): Booking | undefined {
  const slotMins = timeToMinutes(time)
  return bookings
    .filter(b => b.date === date)
    .find(b => {
      const bStart = timeToMinutes(b.time)
      const bEnd = bStart + b.duration
      return slotMins >= bStart && slotMins < bEnd
    })
}

function isSlotTooSoon(date: string, time: string): boolean {
  const now = new Date()
  const [y, mo, d] = date.split('-').map(Number)
  const [h, m] = time.split(':').map(Number)
  const slotTime = new Date(y, mo - 1, d, h, m)
  const minTime = new Date(now.getTime() + MIN_ADVANCE_HOURS * 60 * 60 * 1000)
  return slotTime < minTime
}

function isSlotTooFar(date: string): boolean {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const maxDate = addDays(now, MAX_ADVANCE_WEEKS * 7)
  return new Date(date) > maxDate
}

function fitsBeforeClose(dayOfWeek: number, time: string, duration: number): boolean {
  const hours = OPENING_HOURS[dayOfWeek]
  if (!hours) return false
  return timeToMinutes(time) + duration <= hours.close * 60
}

/* ═══ Email ═══ */

function emailConfigured(): boolean {
  return !!(EMAILJS_SERVICE_ID && EMAILJS_CUSTOMER_TEMPLATE_ID && EMAILJS_OWNER_TEMPLATE_ID && EMAILJS_PUBLIC_KEY)
}

async function sendBookingEmails(booking: Booking) {
  if (!emailConfigured()) {
    console.log('[Booking] E-postkonfiguration saknas. Bokningsdetaljer:', booking)
    return
  }

  const endTime = minutesToTime(timeToMinutes(booking.time) + booking.duration)

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_CUSTOMER_TEMPLATE_ID,
      {
        to_email: booking.email,
        to_name: booking.name,
        service_name: booking.service,
        booking_date: `${getDayName(booking.date)} ${formatSwedishDate(booking.date)}`,
        booking_time: `${booking.time} – ${endTime}`,
        booking_duration: `${booking.duration} min`,
        booking_price: booking.price,
        booking_id: booking.id,
      },
      EMAILJS_PUBLIC_KEY
    )
  } catch (err) {
    console.error('[Booking] Kunde inte skicka kundmail:', err)
  }

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_OWNER_TEMPLATE_ID,
      {
        to_email: OWNER_EMAIL,
        customer_name: booking.name,
        customer_email: booking.email,
        customer_phone: booking.phone,
        service_name: booking.service,
        booking_date: `${getDayName(booking.date)} ${formatSwedishDate(booking.date)}`,
        booking_time: `${booking.time} – ${endTime}`,
        booking_duration: `${booking.duration} min`,
        booking_price: booking.price,
        booking_id: booking.id,
      },
      EMAILJS_PUBLIC_KEY
    )
  } catch (err) {
    console.error('[Booking] Kunde inte skicka ägarmail:', err)
  }
}

async function sendCancellationEmails(booking: Booking) {
  if (!emailConfigured()) {
    console.log('[Booking] Avbokning (e-post ej konfigurerad):', booking)
    return
  }

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_CUSTOMER_TEMPLATE_ID,
      {
        to_email: booking.email,
        to_name: booking.name,
        service_name: `AVBOKAD: ${booking.service}`,
        booking_date: `${getDayName(booking.date)} ${formatSwedishDate(booking.date)}`,
        booking_time: booking.time,
        booking_duration: `${booking.duration} min`,
        booking_price: booking.price,
        booking_id: `${booking.id} (avbokad)`,
      },
      EMAILJS_PUBLIC_KEY
    )
  } catch (err) {
    console.error('[Booking] Kunde inte skicka avbokningsmail:', err)
  }

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_OWNER_TEMPLATE_ID,
      {
        to_email: OWNER_EMAIL,
        customer_name: booking.name,
        customer_email: booking.email,
        customer_phone: booking.phone,
        service_name: `AVBOKAD: ${booking.service}`,
        booking_date: `${getDayName(booking.date)} ${formatSwedishDate(booking.date)}`,
        booking_time: booking.time,
        booking_duration: `${booking.duration} min`,
        booking_price: booking.price,
        booking_id: `${booking.id} (avbokad)`,
      },
      EMAILJS_PUBLIC_KEY
    )
  } catch (err) {
    console.error('[Booking] Kunde inte skicka avbokningsmail till ägare:', err)
  }
}

/* ═══ useScrollLock ═══ */

function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (locked) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [locked])
}

/* ═══ Subcomponents ═══ */

function ServiceSelector({ selected, onSelect }: { selected: Service | null; onSelect: (s: Service) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {SERVICES.map(s => {
        const isSelected = selected?.name === s.name
        return (
          <button
            key={s.name}
            onClick={() => onSelect(s)}
            className={`text-left p-4 border transition-all duration-300 cursor-pointer bg-transparent ${
              isSelected
                ? 'border-[#d4af37]/60 bg-[#d4af37]/5'
                : 'border-white/[0.08] hover:border-[#d4af37]/25'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/80 text-sm font-semibold">{s.name}</span>
              <span className="text-[#d4af37] text-sm font-bold tabular-nums">{s.price}</span>
            </div>
            <span className="text-white/30 text-xs">{s.duration} min</span>
            {isSelected && (
              <div className="mt-2 w-full h-[2px] bg-gradient-to-r from-[#d4af37]/60 to-transparent" />
            )}
          </button>
        )
      })}
    </div>
  )
}

function WeekNav({
  weekStart,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: {
  weekStart: Date
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
}) {
  const weekEnd = addDays(weekStart, 6)
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`

  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className={`text-xs uppercase tracking-[0.2em] px-4 py-2 border transition-all duration-300 bg-transparent ${
          canGoPrev
            ? 'border-white/10 text-white/50 hover:border-[#d4af37]/30 hover:text-[#d4af37] cursor-pointer'
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
        disabled={!canGoNext}
        className={`text-xs uppercase tracking-[0.2em] px-4 py-2 border transition-all duration-300 bg-transparent ${
          canGoNext
            ? 'border-white/10 text-white/50 hover:border-[#d4af37]/30 hover:text-[#d4af37] cursor-pointer'
            : 'border-white/5 text-white/15 cursor-not-allowed'
        }`}
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
      generateTimeSlots(d.getDay()).forEach(s => allSlots.add(s))
    }
    return [...allSlots].sort()
  }, [weekStart])

  const today = formatDate(new Date())

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1">
          <div />
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i)
            const dateStr = formatDate(d)
            const isToday = dateStr === today
            const dow = d.getDay()
            const isClosed = !OPENING_HOURS[dow]
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
                {isClosed && (
                  <div className="text-[8px] text-red-400/50 uppercase tracking-wider mt-0.5">Stängt</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Slots */}
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

                const tooSoon = isSlotTooSoon(dateStr, time)
                const tooFar = isSlotTooFar(dateStr)
                const existingBooking = getBookingAt(bookings, dateStr, time)
                const isBookedHere = !!existingBooking
                const conflicting = selectedService
                  ? isSlotConflicting(bookings, dateStr, time, selectedService.duration)
                  : false
                const fitsSchedule = selectedService
                  ? fitsBeforeClose(dow, time, selectedService.duration)
                  : true
                const available = !tooSoon && !tooFar && !isBookedHere && !conflicting && fitsSchedule && !!selectedService

                let cellClass = 'h-10 transition-all duration-200 border relative group '

                if (tooSoon || tooFar) {
                  cellClass += 'bg-white/[0.02] border-white/[0.03] cursor-default'
                } else if (isBookedHere) {
                  cellClass += 'bg-red-900/20 border-red-500/20 cursor-default'
                } else if (!selectedService) {
                  cellClass += 'bg-white/[0.03] border-white/[0.05] cursor-default'
                } else if (conflicting || !fitsSchedule) {
                  cellClass += 'bg-white/[0.02] border-white/[0.04] cursor-default'
                } else {
                  cellClass += 'bg-emerald-900/15 border-emerald-500/20 hover:bg-emerald-900/30 hover:border-emerald-500/40 cursor-pointer'
                }

                return (
                  <button
                    key={i}
                    disabled={!available}
                    onClick={() => available && onSlotClick(dateStr, time)}
                    className={`${cellClass} flex items-center justify-center`}
                    title={isBookedHere ? `${existingBooking.service} (${existingBooking.time}–${minutesToTime(timeToMinutes(existingBooking.time) + existingBooking.duration)})` : undefined}
                  >
                    {isBookedHere && (
                      <span className="text-red-400/60 text-[9px] font-bold uppercase tracking-wider">Bokad</span>
                    )}
                    {available && (
                      <span className="text-emerald-400/50 text-[9px] font-bold uppercase tracking-wider group-hover:text-emerald-400/80">Ledig</span>
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
  loading,
}: {
  date: string
  time: string
  service: Service
  onConfirm: (name: string, email: string, phone: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  useScrollLock(true)

  const endTime = minutesToTime(timeToMinutes(time) + service.duration)

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
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setError('Ange ett giltigt telefonnummer')
      return
    }

    onConfirm(name.trim(), email.trim(), phone.trim())
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative bg-[#0e0e0e] border border-[#d4af37]/20 p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
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
            <span className="text-white/80 text-sm">{getDayName(date)} {formatSwedishDate(date)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
            <span className="text-white/40 text-sm">Tid</span>
            <span className="text-white/80 text-sm font-semibold tabular-nums">{time} – {endTime}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
              Ditt namn *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Förnamn Efternamn"
              disabled={loading}
              className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-sm px-4 py-3 outline-none focus:border-[#d4af37]/40 transition-colors placeholder:text-white/20 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
              E-postadress *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="din@email.se"
              disabled={loading}
              className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-sm px-4 py-3 outline-none focus:border-[#d4af37]/40 transition-colors placeholder:text-white/20 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
              Telefonnummer *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="070-123 45 67"
              disabled={loading}
              className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-sm px-4 py-3 outline-none focus:border-[#d4af37]/40 transition-colors placeholder:text-white/20 disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#d4af37] text-black text-xs font-bold uppercase tracking-[0.2em] py-4 hover:bg-[#b8960b] transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Bokar...
              </>
            ) : (
              'Boka Nu'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function BookingConfirmation({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  useScrollLock(true)

  const endTime = minutesToTime(timeToMinutes(booking.time) + booking.duration)

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
        <p className="text-white/40 text-sm mb-2">
          En bekräftelse skickas till <span className="text-[#d4af37]">{booking.email}</span>
        </p>
        <p className="text-white/30 text-xs mb-6">
          Ditt boknings-ID: <span className="text-white/70 font-mono font-bold">{booking.id}</span>
        </p>

        <div className="space-y-2 mb-6 text-left bg-white/[0.02] border border-white/[0.06] p-4">
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">Tjänst</span>
            <span className="text-white/80 text-sm font-semibold">{booking.service}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">Pris</span>
            <span className="text-[#d4af37] text-sm font-bold">{booking.price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">Datum</span>
            <span className="text-white/80 text-sm">{getDayName(booking.date)} {formatSwedishDate(booking.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40 text-sm">Tid</span>
            <span className="text-white/80 text-sm font-semibold tabular-nums">{booking.time} – {endTime}</span>
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

function CancelBookingModal({ onCancel, onClose, bookings }: {
  onCancel: (booking: Booking) => void
  onClose: () => void
  bookings: Booking[]
}) {
  const [bookingId, setBookingId] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useScrollLock(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!bookingId.trim() || !email.trim()) {
      setError('Ange både boknings-ID och e-postadress')
      return
    }

    const found = bookings.find(
      b => b.id.toUpperCase() === bookingId.trim().toUpperCase() && b.email.toLowerCase() === email.trim().toLowerCase()
    )

    if (!found) {
      setError('Ingen bokning hittades med dessa uppgifter')
      return
    }

    const bookingDate = new Date(found.date)
    const [h, m] = found.time.split(':').map(Number)
    bookingDate.setHours(h, m, 0, 0)
    if (bookingDate <= new Date()) {
      setError('Denna bokning har redan passerat och kan inte avbokas')
      return
    }

    setLoading(true)
    await sendCancellationEmails(found)
    setLoading(false)
    onCancel(found)
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative bg-[#0e0e0e] border border-[#d4af37]/20 p-6 sm:p-8 max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors bg-transparent border-none cursor-pointer text-xl"
        >
          &times;
        </button>

        <h3 className="text-white text-lg font-bold uppercase tracking-[0.1em] mb-1">Avboka</h3>
        <div className="w-12 h-px bg-[#d4af37]/40 mb-4" />
        <p className="text-white/40 text-sm mb-6">
          Ange ditt boknings-ID och den e-postadress du bokade med.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
              Boknings-ID
            </label>
            <input
              type="text"
              value={bookingId}
              onChange={e => setBookingId(e.target.value.toUpperCase())}
              placeholder="T.ex. A3K9F2"
              disabled={loading}
              className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-sm px-4 py-3 outline-none focus:border-[#d4af37]/40 transition-colors placeholder:text-white/20 font-mono uppercase tracking-wider disabled:opacity-50"
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
              disabled={loading}
              className="w-full bg-white/[0.04] border border-white/[0.1] text-white text-sm px-4 py-3 outline-none focus:border-[#d4af37]/40 transition-colors placeholder:text-white/20 disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-900/50 border border-red-500/30 text-red-200 text-xs font-bold uppercase tracking-[0.2em] py-4 hover:bg-red-900/70 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Avbokar...
              </>
            ) : (
              'Avboka'
            )}
          </button>
        </form>
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
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const thisMonday = useMemo(() => getMonday(new Date()), [])
  const maxMonday = useMemo(() => addDays(thisMonday, (MAX_ADVANCE_WEEKS - 1) * 7), [thisMonday])
  const canGoPrev = weekStart > thisMonday
  const canGoNext = weekStart < maxMonday

  const handleSlotClick = useCallback((date: string, time: string) => {
    setPendingSlot({ date, time })
  }, [])

  const handleConfirm = useCallback(async (name: string, email: string, phone: string) => {
    if (!pendingSlot || !selectedService) return

    if (isSlotConflicting(bookings, pendingSlot.date, pendingSlot.time, selectedService.duration)) {
      alert('Denna tid har precis blivit bokad. Välj en annan tid.')
      setPendingSlot(null)
      return
    }

    setLoading(true)

    const booking: Booking = {
      id: generateBookingId(),
      date: pendingSlot.date,
      time: pendingSlot.time,
      service: selectedService.name,
      duration: selectedService.duration,
      price: selectedService.price,
      email,
      phone,
      name,
      createdAt: new Date().toISOString(),
    }

    const updated = [...bookings, booking]
    setBookings(updated)
    saveBookings(updated)
    setPendingSlot(null)

    await sendBookingEmails(booking)

    setLoading(false)
    setConfirmedBooking(booking)
  }, [pendingSlot, selectedService, bookings])

  const handleCancelBooking = useCallback((booking: Booking) => {
    const updated = bookings.filter(b => b.id !== booking.id)
    setBookings(updated)
    saveBookings(updated)
    setShowCancelModal(false)
  }, [bookings])

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
            Välj en tjänst och en ledig tid i kalendern. Bokning kan göras minst {MIN_ADVANCE_HOURS} timmar i förväg, upp till {MAX_ADVANCE_WEEKS} veckor framåt.
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
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
          />

          <CalendarGrid
            weekStart={weekStart}
            bookings={bookings}
            selectedService={selectedService}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Cancel link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-white/25 text-xs underline underline-offset-4 hover:text-white/50 transition-colors bg-transparent border-none cursor-pointer"
          >
            Behöver du avboka? Klicka här
          </button>
        </div>

        {!emailConfigured() && (
          <div className="mt-6 p-4 border border-yellow-600/20 bg-yellow-900/10 text-center">
            <p className="text-yellow-400/70 text-xs">
              E-postbekräftelser är inte konfigurerade. Sätt VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_CUSTOMER_TEMPLATE_ID, VITE_EMAILJS_OWNER_TEMPLATE_ID och VITE_EMAILJS_PUBLIC_KEY i .env-filen.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {pendingSlot && selectedService && (
        <BookingForm
          date={pendingSlot.date}
          time={pendingSlot.time}
          service={selectedService}
          onConfirm={handleConfirm}
          onCancel={() => setPendingSlot(null)}
          loading={loading}
        />
      )}

      {confirmedBooking && (
        <BookingConfirmation
          booking={confirmedBooking}
          onClose={() => setConfirmedBooking(null)}
        />
      )}

      {showCancelModal && (
        <CancelBookingModal
          bookings={bookings}
          onCancel={handleCancelBooking}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </section>
  )
}
