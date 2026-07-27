import { useState, useMemo, useCallback } from 'react'
import { BUSINESS_NAME } from './config'

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

interface Cancellation {
  booking: Booking
  cancelledAt: string
  cancelledBy: 'admin' | 'customer'
}

function toTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`
}
function toMin(t: string): number { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function loadBookings(): Booking[] {
  try {
    const raw = localStorage.getItem('bookings_data')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveBookings(bookings: Booking[]) {
  localStorage.setItem('bookings_data', JSON.stringify(bookings))
}

function loadCancellations(): Cancellation[] {
  try {
    const raw = localStorage.getItem('cancellations_data')
    if (!raw) return []
    const all: Cancellation[] = JSON.parse(raw)
    const now = Date.now()
    const active = all.filter(c => {
      const [y, mo, d] = c.booking.date.split('-').map(Number)
      const [h, m] = c.booking.time.split(':').map(Number)
      return new Date(y, mo - 1, d, h, m).getTime() + 24 * 3600000 > now
    })
    if (active.length !== all.length) localStorage.setItem('cancellations_data', JSON.stringify(active))
    return active
  } catch { return [] }
}

function saveCancellation(c: Cancellation) {
  const all = loadCancellations()
  all.unshift(c)
  localStorage.setItem('cancellations_data', JSON.stringify(all))
}

function fmtDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

function fmtDateFull(date: string): string {
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
  const dt = new Date(date + 'T12:00:00')
  return `${days[dt.getDay()]} ${fmtDate(date)}`
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`
}

function isUpcoming(b: Booking): boolean {
  const now = new Date()
  const [y, mo, d] = b.date.split('-').map(Number)
  const [h, m] = b.time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, m) > now
}

function isPast(b: Booking): boolean { return !isUpcoming(b) }

/* ═══ Stat Card ═══ */

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

/* ═══ Booking Row ═══ */

function BookingRow({ booking, showDate, onCancel }: { booking: Booking; showDate?: boolean; onCancel?: (b: Booking) => void }) {
  const end = toTime(toMin(booking.time) + booking.duration)
  const upcoming = isUpcoming(booking)

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: showDate ? '100px 1fr 1fr 1fr auto' : '80px 1fr 1fr 1fr auto',
      alignItems: 'center', gap: 12, padding: '14px 20px',
      borderBottom: '1px solid var(--border)', fontSize: '0.875rem',
      opacity: upcoming ? 1 : 0.5,
    }}>
      <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
        {showDate ? fmtDate(booking.date) + ' ' : ''}{booking.time}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>– {end}</div>
      </div>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{booking.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{booking.phone}</div>
      </div>
      <div>
        <div style={{ color: 'var(--text-secondary)' }}>{booking.service}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>{booking.price}</div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
        <div>{booking.email}</div>
        <div style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em', marginTop: 2 }}>ID: {booking.id}</div>
      </div>
      {onCancel && upcoming && (
        <button onClick={() => onCancel(booking)} style={{
          background: 'none', border: '1px solid var(--danger-border)', borderRadius: 6,
          color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, padding: '6px 12px',
          cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}>
          Avboka
        </button>
      )}
      {(!onCancel || !upcoming) && <div />}
    </div>
  )
}

/* ═══ Cancellation Row ═══ */

function CancellationRow({ cancellation }: { cancellation: Cancellation }) {
  const b = cancellation.booking
  const end = toTime(toMin(b.time) + b.duration)

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr auto',
      alignItems: 'center', gap: 12, padding: '14px 20px',
      borderBottom: '1px solid var(--border)', fontSize: '0.875rem',
      opacity: 0.7,
    }}>
      <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
        {fmtDate(b.date)} {b.time}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>– {end}</div>
      </div>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{b.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{b.phone}</div>
      </div>
      <div>
        <div style={{ color: 'var(--text-secondary)' }}>{b.service}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>{b.price}</div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
        <div>{b.email}</div>
        <div style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em', marginTop: 2 }}>ID: {b.id}</div>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
      }}>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 4,
          background: cancellation.cancelledBy === 'admin' ? 'var(--accent-soft)' : 'var(--danger-soft)',
          color: cancellation.cancelledBy === 'admin' ? 'var(--accent)' : 'var(--danger)',
          letterSpacing: '0.03em',
        }}>
          {cancellation.cancelledBy === 'admin' ? 'Admin' : 'Kund'}
        </span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {fmtDateTime(cancellation.cancelledAt)}
        </span>
      </div>
    </div>
  )
}

/* ═══ Main ═══ */

export default function AdminPanel() {
  const [bookings, setBookings] = useState<Booking[]>(() => loadBookings())
  const [cancellations] = useState<Cancellation[]>(() => loadCancellations())
  const [tab, setTab] = useState<'today' | 'upcoming' | 'past' | 'cancelled'>('today')
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null)
  const [cancelDone, setCancelDone] = useState<Booking | null>(null)

  const todayStr = useMemo(() => today(), [])

  const todayBookings = useMemo(() =>
    bookings.filter(b => b.date === todayStr).sort((a, b) => a.time.localeCompare(b.time)),
    [bookings, todayStr]
  )

  const upcomingBookings = useMemo(() =>
    bookings.filter(b => isUpcoming(b) && b.date !== todayStr).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [bookings, todayStr]
  )

  const pastBookings = useMemo(() =>
    bookings.filter(b => isPast(b)).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
    [bookings]
  )

  const todayRevenue = useMemo(() => {
    return todayBookings.reduce((sum, b) => sum + parseInt(b.price.replace(/\D/g, '')) || 0, 0)
  }, [todayBookings])

  const weekBookings = useMemo(() => {
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return bookings.filter(b => {
      const d = new Date(b.date)
      return d >= now && d <= weekEnd
    })
  }, [bookings])

  const serviceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    bookings.filter(isUpcoming).forEach(b => { counts[b.service] = (counts[b.service] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [bookings])

  const handleCancel = useCallback((b: Booking) => {
    setConfirmCancel(b)
  }, [])

  const doCancel = useCallback(() => {
    if (!confirmCancel) return
    saveCancellation({
      booking: confirmCancel,
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'admin',
    })
    const updated = bookings.filter(x => x.id !== confirmCancel.id)
    setBookings(updated)
    saveBookings(updated)
    setCancelDone(confirmCancel)
    setConfirmCancel(null)
  }, [confirmCancel, bookings])

  const currentList = tab === 'today' ? todayBookings : tab === 'upcoming' ? upcomingBookings : tab === 'past' ? pastBookings : []

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', border: 'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'none', color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontSize: '0.875rem', fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 64px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>{BUSINESS_NAME}</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>Bokningsöversikt &middot; {fmtDateFull(todayStr)}</p>
          </div>
          <a href="#" onClick={e => { e.preventDefault(); window.location.hash = ''; window.location.reload() }} style={{
            padding: '9px 20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
            background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500,
            textDecoration: 'none', transition: 'all 0.15s', cursor: 'pointer',
          }}>
            Bokningssida
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          <StatCard label="Idag" value={todayBookings.length} sub={todayBookings.length > 0 ? `${todayRevenue} kr intäkt` : 'Inga bokningar'} />
          <StatCard label="Denna vecka" value={weekBookings.length} />
          <StatCard label="Kommande" value={upcomingBookings.length + todayBookings.filter(isUpcoming).length} />
          <StatCard label="Avbokade" value={cancellations.length} />
          <StatCard label="Totalt" value={bookings.length} />
        </div>

        {/* Service breakdown */}
        {serviceBreakdown.length > 0 && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '20px 24px', marginBottom: 32,
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Kommande per tjänst</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {serviceBreakdown.map(([name, count]) => (
                <div key={name} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-muted)', borderRadius: 20, padding: '6px 14px',
                  fontSize: '0.8125rem',
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings list */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)', flexWrap: 'wrap' }}>
            <button onClick={() => setTab('today')} style={tabStyle(tab === 'today')}>
              Idag ({todayBookings.length})
            </button>
            <button onClick={() => setTab('upcoming')} style={tabStyle(tab === 'upcoming')}>
              Kommande ({upcomingBookings.length})
            </button>
            <button onClick={() => setTab('past')} style={tabStyle(tab === 'past')}>
              Historik ({pastBookings.length})
            </button>
            <button onClick={() => setTab('cancelled')} style={tabStyle(tab === 'cancelled')}>
              Avbokade ({cancellations.length})
            </button>
          </div>

          {tab !== 'cancelled' ? (
            <>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: tab !== 'today' ? '100px 1fr 1fr 1fr auto' : '80px 1fr 1fr 1fr auto',
                gap: 12, padding: '10px 20px', fontSize: '0.6875rem', fontWeight: 600,
                color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border)',
              }}>
                <div>Tid</div>
                <div>Kund</div>
                <div>Tjänst</div>
                <div>Kontakt</div>
                <div />
              </div>

              {/* Rows */}
              {currentList.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  {tab === 'today' ? 'Inga bokningar idag' : tab === 'upcoming' ? 'Inga kommande bokningar' : 'Ingen historik'}
                </div>
              ) : (
                <>
                  {tab !== 'today' ? (
                    (() => {
                      const groups: Record<string, Booking[]> = {}
                      currentList.forEach(b => { (groups[b.date] ??= []).push(b) })
                      return Object.entries(groups).map(([date, bks]) => (
                        <div key={date}>
                          <div style={{
                            padding: '8px 20px', fontSize: '0.75rem', fontWeight: 600,
                            color: 'var(--text-tertiary)', background: 'var(--bg-muted)',
                            borderBottom: '1px solid var(--border)',
                          }}>
                            {fmtDateFull(date)}
                          </div>
                          {bks.map(b => <BookingRow key={b.id} booking={b} showDate={false} onCancel={tab === 'upcoming' ? handleCancel : undefined} />)}
                        </div>
                      ))
                    })()
                  ) : (
                    currentList.map(b => <BookingRow key={b.id} booking={b} onCancel={handleCancel} />)
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Cancellations header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 1fr 1fr auto',
                gap: 12, padding: '10px 20px', fontSize: '0.6875rem', fontWeight: 600,
                color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border)',
              }}>
                <div>Bokad tid</div>
                <div>Kund</div>
                <div>Tjänst</div>
                <div>Kontakt</div>
                <div>Avbokad</div>
              </div>

              {cancellations.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  Inga avbokningar
                </div>
              ) : (
                cancellations.map((c, i) => <CancellationRow key={`${c.booking.id}-${i}`} cancellation={c} />)
              )}
            </>
          )}
        </div>
      </div>

      {/* Cancel confirmation */}
      {confirmCancel && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => setConfirmCancel(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'overlay-in 0.2s ease-out' }} />
          <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', animation: 'modal-in 0.25s ease-out', padding: '28px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 8px' }}>Avboka?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 4px' }}>
              <strong>{confirmCancel.name}</strong> &middot; {confirmCancel.service}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
              {fmtDateFull(confirmCancel.date)} kl {confirmCancel.time}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmCancel(null)} style={{
                flex: 1, padding: '11px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
                background: 'var(--bg-card)', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              }}>
                Avbryt
              </button>
              <button onClick={doCancel} style={{
                flex: 1, padding: '11px', border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-xs)', background: 'var(--danger)', color: '#fff',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              }}>
                Avboka
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel done confirmation */}
      {cancelDone && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => setCancelDone(null)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'overlay-in 0.2s ease-out' }} />
          <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', animation: 'modal-in 0.25s ease-out', padding: '28px', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', animation: 'check-pop 0.4s ease-out',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 6px' }}>Bokning avbokad</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 4px' }}>
              <strong>{cancelDone.name}</strong>s bokning har avbokats.
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>
              {cancelDone.service} &middot; {fmtDateFull(cancelDone.date)} kl {cancelDone.time}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
              Avbokningen har sparats i historiken.
            </p>
            <button onClick={() => setCancelDone(null)} style={{
              padding: '11px 32px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
              background: 'var(--bg-card)', color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
            }}>
              Stäng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
