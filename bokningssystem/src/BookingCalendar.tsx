import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  SERVICES, OPENING_HOURS, BUSINESS_NAME,
  SLOT_INTERVAL, BUFFER_MINUTES, MIN_ADVANCE_HOURS, MAX_ADVANCE_WEEKS,
  type Service,
} from './config'
import { emailConfigured, sendBookingEmails, sendCancellationEmails } from './email'

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

/* ═══ Constants ═══ */

const DAY_NAMES = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const DAY_NAMES_FULL = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

/* ═══ Helpers ═══ */

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day))
  date.setHours(0, 0, 0, 0)
  return date
}

function fmt(d: Date): string { return d.toISOString().split('T')[0] }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toMin(t: string): number { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function toTime(m: number): string { return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}` }

function getDayName(date: string): string {
  const dow = new Date(date).getDay()
  return DAY_NAMES_FULL[dow === 0 ? 6 : dow - 1]
}

function fmtSE(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m} ${y}`
}

function genId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function timeSlots(dow: number): string[] {
  const h = OPENING_HOURS[dow]
  if (!h) return []
  const slots: string[] = []
  let m = h.open * 60
  while (m < h.close * 60) { slots.push(toTime(m)); m += SLOT_INTERVAL }
  return slots
}

/* ═══ Storage ═══ */

function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem('bookings_data')
    if (!raw) return []
    const all: Booking[] = JSON.parse(raw)
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 1); cutoff.setHours(0, 0, 0, 0)
    const active = all.filter(b => new Date(b.date) >= cutoff)
    if (active.length !== all.length) localStorage.setItem('bookings_data', JSON.stringify(active))
    return active
  } catch { return [] }
}

function saveBookings(bookings: Booking[]) {
  localStorage.setItem('bookings_data', JSON.stringify(bookings))
}

/* ═══ Availability ═══ */

function conflicts(bookings: Booking[], date: string, time: string, duration: number): boolean {
  const s = toMin(time), e = s + duration + BUFFER_MINUTES
  return bookings.filter(b => b.date === date).some(b => {
    const bs = toMin(b.time), be = bs + b.duration + BUFFER_MINUTES
    return s < be && e > bs
  })
}

function bookingAt(bookings: Booking[], date: string, time: string): Booking | undefined {
  const m = toMin(time)
  return bookings.filter(b => b.date === date).find(b => m >= toMin(b.time) && m < toMin(b.time) + b.duration)
}

function tooSoon(date: string, time: string): boolean {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, m] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, m).getTime() < Date.now() + MIN_ADVANCE_HOURS * 3600000
}

function tooFar(date: string): boolean {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return new Date(date) > addDays(now, MAX_ADVANCE_WEEKS * 7)
}

function fits(dow: number, time: string, dur: number): boolean {
  const h = OPENING_HOURS[dow]
  return !!h && toMin(time) + dur <= h.close * 60
}

/* ═══ Scroll lock ═══ */

function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [locked])
}

/* ═══ ServiceSelector ═══ */

function ServiceSelector({ selected, onSelect }: { selected: Service | null; onSelect: (s: Service) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {SERVICES.map(s => (
        <button
          key={s.name}
          onClick={() => onSelect(s)}
          className={`text-left p-4 border transition-all duration-300 cursor-pointer bg-transparent rounded-lg ${
            selected?.name === s.name
              ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
              : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/90 text-sm font-semibold">{s.name}</span>
            <span className="text-blue-400 text-sm font-bold tabular-nums">{s.price}</span>
          </div>
          <span className="text-white/40 text-xs">{s.duration} min</span>
        </button>
      ))}
    </div>
  )
}

/* ═══ WeekNav ═══ */

function WeekNav({ weekStart, canPrev, canNext, onPrev, onNext }: {
  weekStart: Date; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void
}) {
  const f = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`
  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={onPrev} disabled={!canPrev}
        className={`text-xs px-4 py-2 rounded border transition bg-transparent ${canPrev ? 'border-gray-600 text-white/60 hover:border-blue-500 hover:text-blue-400 cursor-pointer' : 'border-gray-800 text-white/20 cursor-not-allowed'}`}>
        &larr; Förra
      </button>
      <span className="text-white/70 text-sm font-medium tabular-nums">{f(weekStart)} — {f(addDays(weekStart, 6))}</span>
      <button onClick={onNext} disabled={!canNext}
        className={`text-xs px-4 py-2 rounded border transition bg-transparent ${canNext ? 'border-gray-600 text-white/60 hover:border-blue-500 hover:text-blue-400 cursor-pointer' : 'border-gray-800 text-white/20 cursor-not-allowed'}`}>
        Nästa &rarr;
      </button>
    </div>
  )
}

/* ═══ CalendarGrid ═══ */

function CalendarGrid({ weekStart, bookings, service, onSlot }: {
  weekStart: Date; bookings: Booking[]; service: Service | null; onSlot: (d: string, t: string) => void
}) {
  const allSlots = useMemo(() => {
    const s = new Set<string>()
    for (let i = 0; i < 7; i++) timeSlots(addDays(weekStart, i).getDay()).forEach(t => s.add(t))
    return [...s].sort()
  }, [weekStart])

  const today = fmt(new Date())

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1">
          <div />
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i)
            const isToday = fmt(d) === today
            const closed = !OPENING_HOURS[d.getDay()]
            return (
              <div key={i} className={`text-center py-2 rounded ${isToday ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : ''}`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-blue-400' : 'text-white/40'}`}>{DAY_NAMES[i]}</div>
                <div className={`text-sm font-semibold tabular-nums mt-0.5 ${isToday ? 'text-blue-400' : 'text-white/70'}`}>{d.getDate()}</div>
                {closed && <div className="text-[8px] text-red-400/60 uppercase mt-0.5">Stängt</div>}
              </div>
            )
          })}
        </div>

        <div className="space-y-[2px]">
          {allSlots.map(time => (
            <div key={time} className="grid grid-cols-[60px_repeat(7,1fr)] gap-[2px]">
              <div className="flex items-center justify-end pr-3">
                <span className="text-white/25 text-[11px] font-medium tabular-nums">{time}</span>
              </div>
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(weekStart, i)
                const ds = fmt(d)
                const dow = d.getDay()
                if (!timeSlots(dow).includes(time)) return <div key={i} className="h-10 bg-white/[0.01] rounded-sm" />

                const existing = bookingAt(bookings, ds, time)
                const booked = !!existing
                const soon = tooSoon(ds, time)
                const far = tooFar(ds)
                const clash = service ? conflicts(bookings, ds, time, service.duration) : false
                const ok = service ? fits(dow, time, service.duration) : true
                const available = !soon && !far && !booked && !clash && ok && !!service

                let cls = 'h-10 rounded-sm transition-all duration-200 border flex items-center justify-center '
                if (soon || far) cls += 'bg-white/[0.02] border-white/[0.03] cursor-default'
                else if (booked) cls += 'bg-red-900/20 border-red-500/20 cursor-default'
                else if (!service) cls += 'bg-white/[0.03] border-white/[0.05] cursor-default'
                else if (clash || !ok) cls += 'bg-white/[0.02] border-white/[0.04] cursor-default'
                else cls += 'bg-emerald-900/15 border-emerald-500/20 hover:bg-emerald-900/30 hover:border-emerald-500/40 cursor-pointer'

                return (
                  <button key={i} disabled={!available} onClick={() => available && onSlot(ds, time)} className={cls}
                    title={booked ? `${existing.service} (${existing.time}–${toTime(toMin(existing.time) + existing.duration)})` : undefined}>
                    {booked && <span className="text-red-400/60 text-[9px] font-bold uppercase tracking-wider">Bokad</span>}
                    {available && <span className="text-emerald-400/50 text-[9px] font-bold uppercase tracking-wider group-hover:text-emerald-400/80">Ledig</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
          {[
            { bg: 'bg-emerald-900/30', border: 'border-emerald-500/30', label: 'Ledig' },
            { bg: 'bg-red-900/30', border: 'border-red-500/30', label: 'Bokad' },
            { bg: 'bg-white/[0.02]', border: 'border-white/[0.05]', label: 'Ej tillgänglig' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${l.bg} border ${l.border}`} />
              <span className="text-white/40 text-[10px] uppercase tracking-wider">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══ BookingForm ═══ */

function BookingForm({ date, time, service, loading, onConfirm, onCancel }: {
  date: string; time: string; service: Service; loading: boolean
  onConfirm: (name: string, email: string, phone: string) => void; onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  useScrollLock(true)

  const end = toTime(toMin(time) + service.duration)

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!name.trim()) { setError('Ange ditt namn'); return }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Ange en giltig e-postadress'); return }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) { setError('Ange ett giltigt telefonnummer'); return }
    onConfirm(name.trim(), email.trim(), phone.trim())
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onCancel} className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors bg-transparent border-none cursor-pointer text-xl">&times;</button>
        <h3 className="text-white text-lg font-bold mb-1">Bekräfta bokning</h3>
        <div className="w-10 h-0.5 bg-blue-500/50 rounded mb-6" />

        <div className="space-y-2 mb-6">
          {[
            ['Tjänst', service.name],
            ['Pris', service.price],
            ['Dag', `${getDayName(date)} ${fmtSE(date)}`],
            ['Tid', `${time} – ${end}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-white/[0.06]">
              <span className="text-white/40 text-sm">{k}</span>
              <span className={`text-sm font-semibold ${k === 'Pris' ? 'text-blue-400' : 'text-white/80'}`}>{v}</span>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {[
            { label: 'Ditt namn', type: 'text', value: name, set: setName, ph: 'Förnamn Efternamn' },
            { label: 'E-postadress', type: 'email', value: email, set: setEmail, ph: 'din@email.se' },
            { label: 'Telefonnummer', type: 'tel', value: phone, set: setPhone, ph: '070-123 45 67' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2">{f.label} *</label>
              <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph} disabled={loading}
                className="w-full bg-white/[0.04] border border-gray-700 rounded text-white text-sm px-4 py-3 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20 disabled:opacity-50" />
            </div>
          ))}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-blue-700 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Bokar...</> : 'Boka Nu'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ═══ Confirmation ═══ */

function Confirmation({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  useScrollLock(true)
  const end = toTime(toMin(booking.time) + booking.duration)

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 sm:p-8 max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-900/20 border border-emerald-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h3 className="text-white text-lg font-bold mb-2">Bokning bekräftad!</h3>
        <p className="text-white/40 text-sm mb-1">Bekräftelse skickas till <span className="text-blue-400">{booking.email}</span></p>
        <p className="text-white/30 text-xs mb-6">Boknings-ID: <span className="text-white/70 font-mono font-bold">{booking.id}</span></p>

        <div className="space-y-2 mb-6 text-left bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
          {[['Tjänst', booking.service], ['Pris', booking.price], ['Datum', `${getDayName(booking.date)} ${fmtSE(booking.date)}`], ['Tid', `${booking.time} – ${end}`]].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-white/40 text-sm">{k}</span>
              <span className={`text-sm font-semibold ${k === 'Pris' ? 'text-blue-400' : 'text-white/80'}`}>{v}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="border border-blue-500/40 text-blue-400 text-xs font-bold uppercase tracking-widest px-8 py-3 rounded hover:bg-blue-600 hover:text-white transition-all bg-transparent cursor-pointer">Stäng</button>
      </div>
    </div>
  )
}

/* ═══ CancelModal ═══ */

function CancelModal({ bookings, onCancel, onClose }: {
  bookings: Booking[]; onCancel: (b: Booking) => void; onClose: () => void
}) {
  const [bid, setBid] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useScrollLock(true)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!bid.trim() || !email.trim()) { setError('Ange både boknings-ID och e-postadress'); return }
    const found = bookings.find(b => b.id.toUpperCase() === bid.trim().toUpperCase() && b.email.toLowerCase() === email.trim().toLowerCase())
    if (!found) { setError('Ingen bokning hittades med dessa uppgifter'); return }
    const dt = new Date(found.date); const [h, m] = found.time.split(':').map(Number); dt.setHours(h, m)
    if (dt <= new Date()) { setError('Denna bokning har redan passerat'); return }
    setLoading(true)
    await sendCancellationEmails({ ...found, endTime: toTime(toMin(found.time) + found.duration), dayName: getDayName(found.date) })
    setLoading(false)
    onCancel(found)
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 sm:p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors bg-transparent border-none cursor-pointer text-xl">&times;</button>
        <h3 className="text-white text-lg font-bold mb-1">Avboka</h3>
        <div className="w-10 h-0.5 bg-blue-500/50 rounded mb-4" />
        <p className="text-white/40 text-sm mb-6">Ange ditt boknings-ID och den e-post du bokade med.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2">Boknings-ID</label>
            <input type="text" value={bid} onChange={e => setBid(e.target.value.toUpperCase())} placeholder="T.ex. A3K9F2" disabled={loading}
              className="w-full bg-white/[0.04] border border-gray-700 rounded text-white text-sm px-4 py-3 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20 font-mono uppercase tracking-wider disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2">E-postadress</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@email.se" disabled={loading}
              className="w-full bg-white/[0.04] border border-gray-700 rounded text-white text-sm px-4 py-3 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20 disabled:opacity-50" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-red-900/50 border border-red-500/30 text-red-200 text-xs font-bold uppercase tracking-widest py-4 rounded hover:bg-red-900/70 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Spinner /> Avbokar...</> : 'Avboka'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ═══ Spinner ═══ */

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

/* ═══ Main ═══ */

export default function BookingCalendar() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [service, setService] = useState<Service | null>(null)
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings())
  const [pending, setPending] = useState<{ date: string; time: string } | null>(null)
  const [confirmed, setConfirmed] = useState<Booking | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const [loading, setLoading] = useState(false)

  const thisMonday = useMemo(() => getMonday(new Date()), [])
  const maxMonday = useMemo(() => addDays(thisMonday, (MAX_ADVANCE_WEEKS - 1) * 7), [thisMonday])

  const handleConfirm = useCallback(async (name: string, email: string, phone: string) => {
    if (!pending || !service) return
    if (conflicts(bookings, pending.date, pending.time, service.duration)) {
      alert('Denna tid har precis blivit bokad. Välj en annan tid.')
      setPending(null); return
    }
    setLoading(true)
    const booking: Booking = {
      id: genId(), date: pending.date, time: pending.time,
      service: service.name, duration: service.duration, price: service.price,
      email, phone, name, createdAt: new Date().toISOString(),
    }
    const updated = [...bookings, booking]
    setBookings(updated); saveBookings(updated); setPending(null)
    await sendBookingEmails({ ...booking, endTime: toTime(toMin(booking.time) + booking.duration), dayName: getDayName(booking.date) })
    setLoading(false); setConfirmed(booking)
  }, [pending, service, bookings])

  const handleCancel = useCallback((b: Booking) => {
    const updated = bookings.filter(x => x.id !== b.id)
    setBookings(updated); saveBookings(updated); setShowCancel(false)
  }, [bookings])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2">{BUSINESS_NAME}</h1>
          <p className="text-white/40 text-sm max-w-lg mx-auto">
            Välj en tjänst och en ledig tid i kalendern. Bokning kan göras minst {MIN_ADVANCE_HOURS} timmar i förväg, upp till {MAX_ADVANCE_WEEKS} veckor framåt.
          </p>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${service ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white/40'}`}>1</span>
            <h2 className="text-white/80 text-sm font-bold uppercase tracking-wider">Välj tjänst</h2>
          </div>
          <ServiceSelector selected={service} onSelect={setService} />
        </div>

        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${service ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white/20'}`}>2</span>
            <h2 className={`text-sm font-bold uppercase tracking-wider ${service ? 'text-white/80' : 'text-white/20'}`}>Välj tid</h2>
            {!service && <span className="text-white/20 text-xs italic ml-1">Välj en tjänst först</span>}
          </div>

          <WeekNav weekStart={weekStart} canPrev={weekStart > thisMonday} canNext={weekStart < maxMonday}
            onPrev={() => setWeekStart(p => addDays(p, -7))} onNext={() => setWeekStart(p => addDays(p, 7))} />
          <CalendarGrid weekStart={weekStart} bookings={bookings} service={service} onSlot={(d, t) => setPending({ date: d, time: t })} />
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => setShowCancel(true)}
            className="text-white/25 text-xs underline underline-offset-4 hover:text-white/50 transition-colors bg-transparent border-none cursor-pointer">
            Behöver du avboka? Klicka här
          </button>
        </div>

        {!emailConfigured() && (
          <div className="mt-6 p-4 border border-yellow-600/20 bg-yellow-900/10 rounded-lg text-center">
            <p className="text-yellow-400/70 text-xs">
              E-postbekräftelser ej konfigurerade. Se .env.example för instruktioner.
            </p>
          </div>
        )}
      </div>

      {pending && service && <BookingForm date={pending.date} time={pending.time} service={service} loading={loading} onConfirm={handleConfirm} onCancel={() => setPending(null)} />}
      {confirmed && <Confirmation booking={confirmed} onClose={() => setConfirmed(null)} />}
      {showCancel && <CancelModal bookings={bookings} onCancel={handleCancel} onClose={() => setShowCancel(false)} />}
    </div>
  )
}
