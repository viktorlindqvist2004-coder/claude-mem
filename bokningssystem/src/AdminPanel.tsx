import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BookingConfig } from './config'
import {
  WEEKDAY_NAMES, defaultSchedule, formatDateLong, fromDateKey, hoursFor,
  slotsForDay, toDateKey, toHHMM, toMinutes, weekdayShort,
} from './availability'
import { createStore, storeMode } from './store'
import type { Block, Booking, Schedule, WeekHours } from './types'

export type AdminPanelProps = {
  config: BookingConfig
  /** Where the "back to the site" link points. */
  homeHref?: string
}

/**
 * The owner's view of the book.
 *
 * How the gate works depends on where the data lives. With Supabase
 * configured it is a real sign-in, and the tables are closed without a
 * session by row level security — so the panel cannot be bypassed by editing
 * the page. In local mode there is nothing to protect and nothing to protect
 * it with: the password sits in the bundle and only keeps casual visitors out.
 */
export default function AdminPanel({ config, homeHref = '/' }: AdminPanelProps) {
  const store = useMemo(() => createStore(config), [config])
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { void store.hasSession().then(setAuthed) }, [store])

  if (authed === null) return <div className="bk bk-login"><p className="bk-note">…</p></div>

  if (!authed) {
    return (
      <div className="bk bk-login">
        <form onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true); setError(false)
          try {
            await store.signIn(email.trim(), pw)
            setAuthed(true)
          } catch { setError(true) } finally { setBusy(false) }
        }}>
          <p className="bk-brand" style={{ justifyContent: 'center', marginBottom: '2rem' }}>{config.businessName}</p>
          <p className="bk-eyebrow">Adminpanel</p>
          <div className="bk-rule" />
          {storeMode === 'shared' && (
            <input className="bk-field" type="email" value={email} autoComplete="username" autoFocus
              onChange={(e) => { setEmail(e.target.value); setError(false) }} placeholder="E-post" />
          )}
          <input className="bk-field" type="password" value={pw} autoComplete="current-password"
            autoFocus={storeMode === 'local'}
            onChange={(e) => { setPw(e.target.value); setError(false) }} placeholder="Lösenord" />
          {error && <p className="bk-error">Fel uppgifter.</p>}
          <button type="submit" className="bk-btn bk-btn--block" disabled={busy} style={{ marginTop: '1rem' }}>
            {busy ? 'Loggar in…' : 'Logga in'}
          </button>
          <a className="bk-back" href={homeHref}>← Till webbplatsen</a>
        </form>
      </div>
    )
  }

  return <Board config={config} store={store} homeHref={homeHref}
    onLogout={async () => { await store.signOut(); setAuthed(false) }} />
}

function Board({
  config, store, homeHref, onLogout,
}: {
  config: BookingConfig
  store: ReturnType<typeof createStore>
  homeHref: string
  onLogout: () => void | Promise<void>
}) {
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [schedule, setSchedule] = useState<Schedule>(() => defaultSchedule(config))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'day' | 'hours'>('day')

  const [addingBlock, setAddingBlock] = useState(false)
  const [blockTime, setBlockTime] = useState('12:00')
  const [blockDuration, setBlockDuration] = useState(60)
  const [blockReason, setBlockReason] = useState('')

  const strip = useMemo(() => {
    const base = fromDateKey(dateKey)
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i - 3)
      return d
    })
  }, [dateKey])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const from = toDateKey(strip[0])
      const to = toDateKey(strip[strip.length - 1])
      const [bs, bl, sch] = await Promise.all([
        store.listBookings(from, to), store.listBlocks(from, to), store.getSchedule(),
      ])
      setSchedule(sch)
      setBookings(bs.filter((b) => b.date === dateKey))
      setBlocks(bl.filter((b) => b.date === dateKey))
      const c: Record<string, number> = {}
      for (const b of bs) c[b.date] = (c[b.date] ?? 0) + 1
      setCounts(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta bokningar')
    } finally { setLoading(false) }
  }, [dateKey, strip, store])

  useEffect(() => { void load() }, [load])

  const shiftDay = (delta: number) => {
    const d = fromDateKey(dateKey)
    d.setDate(d.getDate() + delta)
    setDateKey(toDateKey(d))
  }

  const revenue = bookings.reduce((s, b) => s + b.price, 0)
  const hours = hoursFor(dateKey, schedule)

  const timeline = useMemo(() => {
    if (!hours) return []
    const items = [
      ...bookings.map((b) => ({ ...b, kind: 'booking' as const })),
      ...blocks.map((b) => ({ ...b, kind: 'block' as const })),
    ]
    const now = new Date()
    const today = toDateKey(now)
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const rows: { time: string; item: (typeof items)[number] | null; past: boolean }[] = []
    for (let t = toMinutes(hours.open); t < toMinutes(hours.close); t += config.slotInterval) {
      const item = items.find((b) => {
        const s = toMinutes(b.time)
        return t >= s && t < s + b.duration
      })
      rows.push({
        time: toHHMM(t),
        item: item ?? null,
        past: dateKey < today || (dateKey === today && t < nowMin),
      })
    }
    return rows
  }, [hours, bookings, blocks, dateKey, config.slotInterval])

  const freeSlots = hours
    ? slotsForDay(dateKey, 30, [...bookings, ...blocks].map((b) => ({ date: b.date, time: b.time, duration: b.duration })),
        schedule, config).filter((s) => s.available).length
    : 0

  return (
    <div className="bk bk-admin">
      <div className="bk-wrap bk-wrap--wide">
        <header className="bk-row" style={{ marginBottom: '2.5rem' }}>
          <a className="bk-brand" href={homeHref}>{config.businessName}</a>
          <button className="bk-btn bk-btn--ghost bk-btn--sm" onClick={onLogout}>Logga ut</button>
        </header>

        {storeMode === 'local' && (
          <p className="bk-warn">
            Testläge — du ser bara bokningar gjorda i den här webbläsaren. Kunders bokningar
            hamnar i deras egen. Koppla en databas för att se alla på ett ställe.
          </p>
        )}

        <div className="bk-tabs" role="tablist">
          {([['day', 'Dagen'], ['hours', 'Öppettider']] as const).map(([k, label]) => (
            <button key={k} role="tab" className="bk-tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>

        {error && <p className="bk-error" style={{ marginBottom: '1rem' }}>{error}</p>}

        {tab === 'hours' ? (
          <HoursEditor store={store} schedule={schedule} onSaved={load} />
        ) : (
          <>
            <div className="bk-strip">
              {strip.map((d) => {
                const key = toDateKey(d)
                const n = counts[key] ?? 0
                const closed = hoursFor(key, schedule) === null
                return (
                  <button key={key} className={`bk-day${closed ? ' bk-day--closed' : ''}`}
                    aria-pressed={key === dateKey} onClick={() => setDateKey(key)}>
                    <span className="bk-day-name">{weekdayShort(d)}</span>
                    <span className="bk-day-num">{d.getDate()}</span>
                    <span className={`bk-day-count${n > 0 ? ' bk-day--has' : ''}`}>
                      {closed ? '—' : n > 0 ? `${n} bok` : '·'}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="bk-row" style={{ marginBottom: '1.5rem' }}>
              <div className="bk-row bk-row--tight">
                <button className="bk-icon-btn" aria-label="Föregående dag" onClick={() => shiftDay(-1)}>‹</button>
                <button className="bk-icon-btn" aria-label="Nästa dag" onClick={() => shiftDay(1)}>›</button>
                <h1 className="bk-title" style={{ fontSize: 'clamp(1.25rem,4vw,1.75rem)', marginLeft: '.5rem' }}>
                  {formatDateLong(dateKey)}
                </h1>
              </div>
              <button className="bk-btn bk-btn--ghost bk-btn--sm" onClick={() => setDateKey(toDateKey(new Date()))}>
                Idag
              </button>
            </div>

            <div className="bk-grid bk-grid--stats">
              {[
                ['Bokningar', String(bookings.length)],
                ['Lediga tider', hours ? String(freeSlots) : '—'],
                ['Omsättning', `${revenue} ${config.currency}`],
              ].map(([label, value]) => (
                <div key={label} className="bk-stat">
                  <p className="bk-stat-label">{label}</p>
                  <p className="bk-stat-value">{value}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <p className="bk-note" style={{ padding: '3rem 0' }}>Hämtar…</p>
            ) : !hours ? (
              <p className="bk-note" style={{ padding: '3rem 0' }}>Stängt {formatDateLong(dateKey)}.</p>
            ) : (
              <div className="bk-cols">
                <div>
                  <p className="bk-step">Dagen</p>
                  <div className="bk-timeline">
                    {timeline.map((row) => {
                      const starts = row.item && row.item.time === row.time
                      return (
                        <div key={row.time}
                          className={`bk-tl-row${row.item ? (row.item.kind === 'block' ? ' bk-tl-row--block' : ' bk-tl-row--booking') : ''}`}>
                          <span className="bk-tl-time">{row.time}</span>
                          <span className="bk-tl-body">
                            {starts && row.item ? (
                              row.item.kind === 'booking' ? (
                                <span><span className="bk-tl-name">{(row.item as Booking).name}</span>
                                  {' · '}{(row.item as Booking).serviceName}</span>
                              ) : (
                                <span className="bk-muted">
                                  Spärrad{(row.item as Block).reason ? ` · ${(row.item as Block).reason}` : ''}
                                </span>
                              )
                            ) : row.item ? (
                              <span className="bk-tl-past">│</span>
                            ) : row.past ? (
                              <span className="bk-tl-past">Passerad</span>
                            ) : (
                              <span className="bk-tl-free">Ledig</span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="bk-step">Bokningar</p>
                  {bookings.length === 0 ? (
                    <p className="bk-note" style={{ marginBottom: '2.5rem' }}>Inga bokningar den här dagen.</p>
                  ) : (
                    <div className="bk-stack" style={{ marginBottom: '2.5rem' }}>
                      {bookings.map((b) => (
                        <div key={b.id} className="bk-card">
                          <div className="bk-row" style={{ alignItems: 'flex-start' }}>
                            <div>
                              <p style={{ margin: 0, fontSize: '.875rem', fontWeight: 600 }}>
                                <span style={{ color: 'var(--bk-accent)', marginRight: '.5rem' }}>{b.time}</span>{b.name}
                              </p>
                              <p className="bk-note" style={{ margin: '.25rem 0 0' }}>
                                {b.serviceName} · {b.duration} min · {b.price} {config.currency}
                              </p>
                              <a className="bk-link bk-note" href={`tel:${b.phone.replace(/\s|-/g, '')}`}>{b.phone}</a>
                              {b.email && <p className="bk-note" style={{ margin: 0, wordBreak: 'break-all' }}>{b.email}</p>}
                              {b.note && <p className="bk-note" style={{ margin: '.35rem 0 0', fontStyle: 'italic' }}>”{b.note}”</p>}
                            </div>
                            <button className="bk-icon-btn bk-icon-btn--danger" aria-label="Avboka"
                              onClick={async () => {
                                if (!confirm(`Avboka ${b.name} kl ${b.time}?`)) return
                                await store.cancelBooking(b.id); await load()
                              }}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bk-row" style={{ marginBottom: '1rem' }}>
                    <p className="bk-step" style={{ margin: 0 }}>Spärrad tid</p>
                    <button className="bk-btn bk-btn--ghost bk-btn--sm" onClick={() => setAddingBlock((v) => !v)}>
                      + Spärra
                    </button>
                  </div>

                  {addingBlock && (
                    <div className="bk-panel">
                      <div className="bk-inline" style={{ marginBottom: '.75rem' }}>
                        <input type="time" value={blockTime} onChange={(e) => setBlockTime(e.target.value)} />
                        <select value={blockDuration} onChange={(e) => setBlockDuration(Number(e.target.value))}>
                          {[15, 30, 45, 60, 90, 120, 240, 480].map((m) => <option key={m} value={m}>{m} min</option>)}
                        </select>
                      </div>
                      <input className="bk-field" value={blockReason} placeholder="Anledning (valfritt)"
                        onChange={(e) => setBlockReason(e.target.value)} style={{ marginBottom: '.75rem' }} />
                      <button className="bk-btn bk-btn--block bk-btn--sm" onClick={async () => {
                        await store.createBlock({ date: dateKey, time: blockTime, duration: blockDuration, reason: blockReason.trim() })
                        setAddingBlock(false); setBlockReason(''); await load()
                      }}>Spärra tiden</button>
                    </div>
                  )}

                  {blocks.length === 0 ? (
                    <p className="bk-note">Inget spärrat.</p>
                  ) : (
                    <div className="bk-stack">
                      {blocks.map((b) => (
                        <div key={b.id} className="bk-card bk-row">
                          <span className="bk-note">{b.time} · {b.duration} min{b.reason ? ` · ${b.reason}` : ''}</span>
                          <button className="bk-icon-btn bk-icon-btn--danger" aria-label="Ta bort spärr"
                            onClick={async () => { await store.deleteBlock(b.id); await load() }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Opening hours and holidays, so nobody has to touch the code to take a
 *  week off. */
function HoursEditor({
  store, schedule, onSaved,
}: {
  store: ReturnType<typeof createStore>
  schedule: Schedule
  onSaved: () => Promise<void>
}) {
  const [week, setWeek] = useState<WeekHours>(schedule.week)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const [special, setSpecial] = useState(false)
  const [openTime, setOpenTime] = useState('10:00')
  const [closeTime, setCloseTime] = useState('15:00')

  useEffect(() => { setWeek(schedule.week) }, [schedule.week])

  const setDay = (d: number, patch: { open?: string; close?: string } | null) => {
    setSaved(false)
    setWeek((w) => ({ ...w, [d]: patch === null ? null : { open: '10:00', close: '18:00', ...w[d], ...patch } }))
  }

  return (
    <div className="bk-cols">
      <div>
        <p className="bk-step">Vanliga öppettider</p>
        <div className="bk-timeline">
          {WEEK_ORDER.map((d) => {
            const h = week[d]
            return (
              <div key={d} className="bk-hours-row">
                <span className="bk-hours-day">{WEEKDAY_NAMES[d]}</span>
                {h ? (
                  <>
                    <input type="time" value={h.open} onChange={(e) => setDay(d, { open: e.target.value })} />
                    <span className="bk-hours-sep">–</span>
                    <input type="time" value={h.close} onChange={(e) => setDay(d, { close: e.target.value })} />
                  </>
                ) : (
                  <span className="bk-hours-closed">Stängt</span>
                )}
                <button className="bk-btn bk-btn--sm bk-btn--ghost" onClick={() => setDay(d, h ? null : {})}>
                  {h ? 'Stäng' : 'Öppna'}
                </button>
              </div>
            )
          })}
        </div>
        <button className="bk-btn bk-btn--block" style={{ marginTop: '.75rem' }} disabled={saving}
          onClick={async () => {
            setSaving(true); setError(null)
            try { await store.saveWeek(week); setSaved(true); await onSaved() }
            catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte spara') }
            finally { setSaving(false) }
          }}>
          {saving ? 'Sparar…' : saved ? 'Sparat ✓' : 'Spara öppettider'}
        </button>
        {error && <p className="bk-error">{error}</p>}
      </div>

      <div>
        <p className="bk-step">Semester &amp; avvikelser</p>
        <div className="bk-panel">
          <div className="bk-inline" style={{ marginBottom: '.75rem' }}>
            <label className="bk-label">
              <span>Från</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="bk-label">
              <span>Till</span>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <input className="bk-field" value={reason} placeholder="Anledning, t.ex. Semester"
            onChange={(e) => setReason(e.target.value)} style={{ marginBottom: '.75rem' }} />
          <label className="bk-checkbox">
            <input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} />
            Öppet, men andra tider
          </label>
          {special && (
            <div className="bk-inline" style={{ marginBottom: '.75rem' }}>
              <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
              <span className="bk-hours-sep">–</span>
              <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
            </div>
          )}
          <button className="bk-btn bk-btn--block bk-btn--sm" disabled={!from} onClick={async () => {
            try {
              await store.addClosure({
                from, to: to || from, reason: reason.trim(),
                open: special ? openTime : null, close: special ? closeTime : null,
              })
              setFrom(''); setTo(''); setReason(''); setSpecial(false)
              await onSaved()
            } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte spara') }
          }}>Lägg till</button>
        </div>

        {schedule.closures.length === 0 ? (
          <p className="bk-note">Inga inlagda perioder.</p>
        ) : (
          <div className="bk-stack">
            {schedule.closures.map((c) => (
              <div key={c.id} className="bk-card bk-row">
                <span className="bk-note">
                  {c.from}{c.to !== c.from ? ` – ${c.to}` : ''} ·{' '}
                  {c.open && c.close ? `${c.open}–${c.close}` : 'Stängt'}{c.reason ? ` · ${c.reason}` : ''}
                </span>
                <button className="bk-icon-btn bk-icon-btn--danger" aria-label="Ta bort"
                  onClick={async () => { await store.deleteClosure(c.id); await onSaved() }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
