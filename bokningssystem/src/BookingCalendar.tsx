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
    const w = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${w}px`
    return () => { document.body.style.overflow = ''; document.body.style.paddingRight = '' }
  }, [locked])
}

/* ═══ Icons ═══ */

type IconProps = { className?: string; style?: React.CSSProperties }

function IconClock({ className = '', style }: IconProps) {
  return <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}

function IconCalendar({ className = '', style }: IconProps) {
  return <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
}

function IconChevron({ direction, className = '' }: { direction: 'left' | 'right'; className?: string }) {
  return direction === 'left'
    ? <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
    : <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
}

function IconX({ className = '', style }: IconProps) {
  return <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
}

function IconCheck({ className = '', style }: IconProps) {
  return <svg className={className} style={style} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 24, animation: 'check-draw 0.4s ease-out 0.2s both' }}/></svg>
}

function IconMail({ className = '', style }: IconProps) {
  return <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="20" height="16" x="2" y="4" rx="2"/><polyline points="22,7 12,13 2,7"/></svg>
}

function IconTag({ className = '', style }: IconProps) {
  return <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L12 24"/><path d="M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L12 22"/><circle cx="6.5" cy="9.5" r="1" fill="currentColor" stroke="none"/></svg>
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

/* ═══ Shared components ═══ */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useScrollLock(true)
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'overlay-in 0.2s ease-out' }} />
      <div className="relative w-full max-w-[440px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', animation: 'modal-in 0.25s ease-out' }}>
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>{label}</span>
      <span style={{ color: accent ? 'var(--accent)' : 'var(--text)', fontSize: '0.875rem', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.01em' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: '0.9375rem',
  background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
  color: 'var(--text)', transition: 'border-color 0.15s',
}

/* ═══ ServiceSelector ═══ */

function ServiceSelector({ selected, onSelect }: { selected: Service | null; onSelect: (s: Service) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
      {SERVICES.map(s => {
        const active = selected?.name === s.name
        return (
          <button key={s.name} onClick={() => onSelect(s)}
            style={{
              textAlign: 'left', padding: '16px 18px', cursor: 'pointer',
              background: active ? 'var(--accent-soft)' : 'var(--bg-card)',
              border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: active ? 'none' : 'var(--shadow-sm)',
              transition: 'all 0.15s ease',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>{s.name}</span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{s.price}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              <IconClock />
              <span>{s.duration} min</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ═══ WeekNav ═══ */

function WeekNav({ weekStart, canPrev, canNext, onPrev, onNext }: {
  weekStart: Date; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void
}) {
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const label = sameMonth
    ? `${weekStart.getDate()} – ${end.getDate()} ${monthNames[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${weekStart.getDate()} ${monthNames[weekStart.getMonth()]} – ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`

  const btnStyle = (enabled: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    color: enabled ? 'var(--text-secondary)' : 'var(--text-tertiary)',
    opacity: enabled ? 1 : 0.4, boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <button onClick={onPrev} disabled={!canPrev} style={btnStyle(canPrev)}>
        <IconChevron direction="left" />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 600, fontSize: '0.9375rem' }}>
        <IconCalendar style={{ color: 'var(--text-tertiary)' } as React.CSSProperties} />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{label}</span>
      </div>
      <button onClick={onNext} disabled={!canNext} style={btnStyle(canNext)}>
        <IconChevron direction="right" />
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
    <div style={{ overflowX: 'auto', margin: '0 -4px', padding: '0 4px' }}>
      <div style={{ minWidth: 700, background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
          <div />
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i)
            const isToday = fmt(d) === today
            const dayPassed = fmt(d) < today
            const closed = !OPENING_HOURS[d.getDay()]
            return (
              <div key={i} style={{ textAlign: 'center', padding: '12px 4px 10px', borderLeft: '1px solid var(--border)', position: 'relative', opacity: dayPassed ? 0.4 : 1 }}>
                {isToday && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)', borderRadius: '0 0 2px 2px' }} />}
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: isToday ? 'var(--accent)' : 'var(--text-tertiary)', marginBottom: 2 }}>{DAY_NAMES[i]}</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isToday ? 'var(--accent)' : 'var(--text)' }}>{d.getDate()}</div>
                {closed && <div style={{ fontSize: '0.5625rem', color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginTop: 2 }}>Stängt</div>}
              </div>
            )
          })}
        </div>

        {/* Slots */}
        <div>
          {allSlots.map((time, ti) => (
            <div key={time} style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)', borderTop: ti > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                {time}
              </div>
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(weekStart, i)
                const ds = fmt(d)
                const dow = d.getDay()
                const dayPassed = ds < today

                if (!timeSlots(dow).includes(time)) {
                  return <div key={i} style={{ height: 44, borderLeft: '1px solid var(--border)', background: 'var(--bg-muted)', opacity: 0.5 }} />
                }

                if (dayPassed) {
                  return (
                    <div key={i} style={{
                      height: 44, borderLeft: '1px solid var(--border)',
                      background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', opacity: 0.5,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      —
                    </div>
                  )
                }

                const existing = bookingAt(bookings, ds, time)
                const booked = !!existing
                const soon = tooSoon(ds, time)
                const far = tooFar(ds)
                const clash = service ? conflicts(bookings, ds, time, service.duration) : false
                const ok = service ? fits(dow, time, service.duration) : true
                const available = !soon && !far && !booked && !clash && ok && !!service

                let bg = 'transparent'
                let color = 'var(--text-tertiary)'
                let cursor = 'default'
                let label = ''
                let fontWeight = 500

                if (booked) {
                  bg = 'var(--danger-soft)'; color = 'var(--danger)'; label = 'Bokad'; fontWeight = 600
                } else if (available) {
                  bg = 'var(--success-soft)'; color = 'var(--success)'; label = 'Ledig'; cursor = 'pointer'; fontWeight = 600
                } else if (!service) {
                  label = ''
                }

                return (
                  <button key={i} disabled={!available} onClick={() => available && onSlot(ds, time)}
                    title={booked ? `${existing.service} (${existing.time}–${toTime(toMin(existing.time) + existing.duration)})` : undefined}
                    style={{
                      height: 44, border: 'none', borderLeft: '1px solid var(--border)',
                      background: bg, cursor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6875rem', fontWeight, color, textTransform: 'uppercase', letterSpacing: '0.04em',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (available) (e.currentTarget.style.background = 'var(--success-border)') }}
                    onMouseLeave={e => { if (available) (e.currentTarget.style.background = 'var(--success-soft)') }}>
                    {label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
          {[
            { bg: 'var(--success-soft)', border: 'var(--success)', label: 'Ledig' },
            { bg: 'var(--danger-soft)', border: 'var(--danger)', label: 'Bokad' },
            { bg: 'var(--bg-muted)', border: 'var(--text-tertiary)', label: 'Ej tillgänglig' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, border: `2px solid ${l.border}` }} />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{l.label}</span>
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

  const end = toTime(toMin(time) + service.duration)

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!name.trim()) { setError('Ange ditt namn'); return }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Ange en giltig e-postadress'); return }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) { setError('Ange ett giltigt telefonnummer'); return }
    onConfirm(name.trim(), email.trim(), phone.trim())
  }

  return (
    <Modal onClose={onCancel}>
      <div style={{ padding: '28px 28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Bekräfta bokning</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, borderRadius: 6 }}>
            <IconX />
          </button>
        </div>

        <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-xs)', padding: '14px 16px', marginBottom: 24 }}>
          <InfoRow label="Tjänst" value={service.name} />
          <InfoRow label="Pris" value={service.price} accent />
          <InfoRow label="Dag" value={`${getDayName(date)} ${fmtSE(date)}`} />
          <div className="flex items-center justify-between py-2.5">
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Tid</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{time} – {end}</span>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormField label="Ditt namn">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Förnamn Efternamn" disabled={loading} style={inputStyle} />
          </FormField>
          <FormField label="E-postadress">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@email.se" disabled={loading} style={inputStyle} />
          </FormField>
          <FormField label="Telefonnummer">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="070-123 45 67" disabled={loading} style={inputStyle} />
          </FormField>

          {error && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--danger)', fontWeight: 500 }}>{error}</p>
          )}

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '13px', border: 'none', borderRadius: 'var(--radius-xs)',
              background: 'var(--accent)', color: '#fff', fontSize: '0.9375rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}>
            {loading ? <><Spinner /> Bokar...</> : 'Bekräfta bokning'}
          </button>
        </form>
      </div>
    </Modal>
  )
}

/* ═══ Confirmation ═══ */

function Confirmation({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const end = toTime(toMin(booking.time) + booking.duration)
  const hasEmail = emailConfigured()

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: '36px 28px 28px', textAlign: 'center' }}>
        {/* Animated check */}
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'check-pop 0.4s ease-out' }}>
          <IconCheck style={{ color: 'var(--success)' } as React.CSSProperties} />
        </div>

        <h3 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 6px' }}>Bokning bekräftad!</h3>

        {hasEmail ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <IconMail style={{ color: 'var(--text-tertiary)' } as React.CSSProperties} />
            Bekräftelse skickas till <strong style={{ color: 'var(--accent)' }}>{booking.email}</strong>
          </p>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 4px' }}>
            Spara ditt boknings-ID nedan
          </p>
        )}

        {/* Booking ID */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-muted)', borderRadius: 'var(--radius-xs)', padding: '10px 20px', margin: '16px 0 20px', border: '1px dashed var(--border-strong)' }}>
          <IconTag style={{ color: 'var(--text-tertiary)' } as React.CSSProperties} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>ID:</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.12em', fontFamily: 'ui-monospace, monospace', color: 'var(--text)' }}>{booking.id}</span>
        </div>

        {/* Details */}
        <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-xs)', padding: '14px 16px', marginBottom: 24, textAlign: 'left' }}>
          <InfoRow label="Tjänst" value={booking.service} />
          <InfoRow label="Pris" value={booking.price} accent />
          <InfoRow label="Datum" value={`${getDayName(booking.date)} ${fmtSE(booking.date)}`} />
          <div className="flex items-center justify-between py-2.5">
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Tid</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{booking.time} – {end}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          Behöver du avboka? Använd ditt boknings-ID och e-postadress.
        </p>

        <button onClick={onClose}
          style={{
            padding: '11px 32px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
            background: 'var(--bg-card)', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
          Stäng
        </button>
      </div>
    </Modal>
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
  const [cancelled, setCancelled] = useState<Booking | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!bid.trim() || !email.trim()) { setError('Ange både boknings-ID och e-postadress'); return }
    const found = bookings.find(b => b.id.toUpperCase() === bid.trim().toUpperCase() && b.email.toLowerCase() === email.trim().toLowerCase())
    if (!found) { setError('Ingen bokning hittades med dessa uppgifter'); return }
    const dt = new Date(found.date); const [h, m] = found.time.split(':').map(Number); dt.setHours(h, m)
    if (dt <= new Date()) { setError('Denna bokning har redan passerat'); return }
    if (dt.getTime() - Date.now() < 24 * 3600000) { setError('Avbokning måste ske senast 24 timmar innan bokad tid'); return }
    setLoading(true)
    await sendCancellationEmails({ ...found, endTime: toTime(toMin(found.time) + found.duration), dayName: getDayName(found.date) })
    setLoading(false)
    setCancelled(found)
    onCancel(found)
  }

  if (cancelled) {
    const end = toTime(toMin(cancelled.time) + cancelled.duration)
    return (
      <Modal onClose={onClose}>
        <div style={{ padding: '36px 28px 28px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'check-pop 0.4s ease-out' }}>
            <IconX style={{ color: 'var(--danger)', width: 28, height: 28 } as React.CSSProperties} />
          </div>

          <h3 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 6px' }}>Bokning avbokad</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
            Din bokning har avbokats.
            {emailConfigured() && ' En bekräftelse har skickats till din e-post.'}
          </p>

          <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-xs)', padding: '14px 16px', marginBottom: 24, textAlign: 'left' }}>
            <InfoRow label="Tjänst" value={cancelled.service} />
            <InfoRow label="Datum" value={`${getDayName(cancelled.date)} ${fmtSE(cancelled.date)}`} />
            <div className="flex items-center justify-between py-2.5">
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Tid</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{cancelled.time} – {end}</span>
            </div>
          </div>

          <button onClick={onClose}
            style={{
              padding: '11px 32px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
              background: 'var(--bg-card)', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer',
            }}>
            Stäng
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: '28px 28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Avboka</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, borderRadius: 6 }}>
            <IconX />
          </button>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
          Ange ditt boknings-ID och e-postadressen du bokade med.
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--warn-text)', background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', borderRadius: 'var(--radius-xs)', padding: '8px 12px', margin: '0 0 20px' }}>
          Avbokning måste ske senast 24 timmar innan bokad tid.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormField label="Boknings-ID">
            <input type="text" value={bid} onChange={e => setBid(e.target.value.toUpperCase())} placeholder="T.ex. A3K9F2" disabled={loading}
              style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }} />
          </FormField>
          <FormField label="E-postadress">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="din@email.se" disabled={loading} style={inputStyle} />
          </FormField>

          {error && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--danger)', fontWeight: 500 }}>{error}</p>
          )}

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '13px', border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-xs)', background: 'var(--danger-soft)',
              color: 'var(--danger)', fontSize: '0.9375rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
            {loading ? <><Spinner /> Avbokar...</> : 'Avboka'}
          </button>
        </form>
      </div>
    </Modal>
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
    const cancellations = JSON.parse(localStorage.getItem('cancellations_data') || '[]')
    cancellations.unshift({ booking: b, cancelledAt: new Date().toISOString(), cancelledBy: 'customer' })
    localStorage.setItem('cancellations_data', JSON.stringify(cancellations))
    const updated = bookings.filter(x => x.id !== b.id)
    setBookings(updated); saveBookings(updated)
  }, [bookings])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px 64px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)' }}>
            {BUSINESS_NAME}
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Boka en tid genom att välja tjänst och ledig tid i kalendern nedan.
          </p>
        </div>

        {/* Step 1 */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 700,
              background: service ? 'var(--success)' : 'var(--accent)', color: '#fff',
            }}>
              {service ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> : '1'}
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Välj tjänst</h2>
          </div>
          <ServiceSelector selected={service} onSelect={setService} />
        </div>

        {/* Step 2 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 700,
              background: service ? 'var(--accent)' : 'var(--bg-muted)', color: service ? '#fff' : 'var(--text-tertiary)',
              border: service ? 'none' : '1px solid var(--border)',
            }}>
              2
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: service ? 'var(--text)' : 'var(--text-tertiary)' }}>Välj tid</h2>
            {!service && <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Välj en tjänst först</span>}
          </div>

          <WeekNav weekStart={weekStart} canPrev={weekStart > thisMonday} canNext={weekStart < maxMonday}
            onPrev={() => setWeekStart(p => addDays(p, -7))} onNext={() => setWeekStart(p => addDays(p, 7))} />
          <CalendarGrid weekStart={weekStart} bookings={bookings} service={service} onSlot={(d, t) => setPending({ date: d, time: t })} />
        </div>

        {/* Cancel link */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button onClick={() => setShowCancel(true)}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
              padding: '10px 24px', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
            Behöver du avboka?
          </button>
        </div>

        {/* Email warning */}
        {!emailConfigured() && (
          <div style={{ marginTop: 24, padding: '14px 18px', border: '1px solid var(--warn-border)', background: 'var(--warn-bg)', borderRadius: 'var(--radius-xs)', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--warn-text)' }}>
              E-postbekräftelser ej konfigurerade. Se <code style={{ background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem' }}>.env.example</code> för instruktioner.
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
