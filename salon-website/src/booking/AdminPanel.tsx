import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Clock, Loader2, Lock, Plus, Scissors, Trash2, X } from 'lucide-react'
import { SLOT_INTERVAL } from './config'
import { DEFAULT_SCHEDULE, formatDateLong, fromDateKey, hoursFor, slotsForDay, toDateKey, toHHMM, toMinutes, weekdayShort } from './availability'
import { store, storeMode } from './store'
import type { Block, Booking, Schedule, WeekHours } from './types'

/**
 * The barber's view of the book.
 *
 * How the gate works depends on where the data lives. With Supabase
 * configured it is a real sign-in against Supabase Auth, and the tables are
 * closed to anyone without a session by row level security — so the panel
 * cannot be bypassed by editing the page. In local mode there is nothing to
 * protect and nothing to protect it with: the password sits in the bundle
 * and only keeps casual visitors out.
 */
export default function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { void store.hasSession().then(setAuthed) }, [])

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(false)
            try {
              await store.signIn(email.trim(), pw)
              setAuthed(true)
            } catch {
              setError(true)
            } finally {
              setBusy(false)
            }
          }}
          className="w-full max-w-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Scissors className="w-5 h-5 text-[#d4af37]" />
            <span className="text-white text-xl font-script">Gentlemen's</span>
          </div>
          <p className="section-label mb-4">Adminpanel</p>
          <div className="gold-line active mx-auto mb-8" />

          {storeMode === 'shared' && (
            <input
              type="email" value={email} autoFocus autoComplete="username"
              onChange={(e) => { setEmail(e.target.value); setError(false) }}
              placeholder="E-post"
              className="w-full bg-transparent border border-white/[0.1] px-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:border-[#d4af37]/50 focus:outline-none transition-colors mb-2" />
          )}

          <div className="relative">
            <Lock className="w-4 h-4 text-white/25 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="password" value={pw} autoFocus={storeMode === 'local'} autoComplete="current-password"
              onChange={(e) => { setPw(e.target.value); setError(false) }}
              placeholder="Lösenord"
              className="w-full bg-transparent border border-white/[0.1] pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:border-[#d4af37]/50 focus:outline-none transition-colors" />
          </div>

          {error && <p className="text-red-300/80 text-xs mt-3">Fel uppgifter.</p>}

          <button type="submit" disabled={busy}
            className="w-full mt-4 border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold px-8 py-3.5 tracking-[0.2em] uppercase bg-transparent cursor-pointer hover:bg-[#d4af37] hover:text-black transition-all duration-500 disabled:opacity-40">
            {busy ? 'Loggar in…' : 'Logga in'}
          </button>
          <a href="/" className="block mt-6 text-white/25 text-xs no-underline hover:text-white/50 transition-colors">
            ← Till webbplatsen
          </a>
        </form>
      </div>
    )
  }

  return <AdminBoard onLogout={async () => { await store.signOut(); setAuthed(false) }} />
}

function AdminBoard({ onLogout }: { onLogout: () => void | Promise<void> }) {
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingBlock, setAddingBlock] = useState(false)
  const [blockTime, setBlockTime] = useState('12:00')
  const [blockDuration, setBlockDuration] = useState(60)
  const [blockReason, setBlockReason] = useState('')
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE)
  const [tab, setTab] = useState<'day' | 'schedule'>('day')

  // The strip along the top shows the next fortnight at a glance.
  const strip = useMemo(() => {
    const base = fromDateKey(dateKey)
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i - 3)
      return d
    })
  }, [dateKey])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = toDateKey(strip[0])
      const to = toDateKey(strip[strip.length - 1])
      const [bs, bl, sch] = await Promise.all([
        store.listBookings(from, to), store.listBlocks(from, to), store.getSchedule(),
      ])
      setSchedule(sch)
      setBookings(bs.filter((b) => b.date === dateKey))
      setBlocks(bl.filter((b) => b.date === dateKey))
      const counts: Record<string, number> = {}
      for (const b of bs) counts[b.date] = (counts[b.date] ?? 0) + 1
      setWeekCounts(counts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta bokningar')
    } finally {
      setLoading(false)
    }
  }, [dateKey, strip])

  useEffect(() => { void load() }, [load])

  const shiftDay = (delta: number) => {
    const d = fromDateKey(dateKey)
    d.setDate(d.getDate() + delta)
    setDateKey(toDateKey(d))
  }

  const revenue = bookings.reduce((sum, b) => sum + b.price, 0)
  const hours = hoursFor(dateKey, schedule)

  // Timeline of the day: every slot on the grid, marked with what holds it.
  // Slots already gone by are flagged so the strip does not advertise them
  // as free while the counter beside it — which respects the advance
  // window — reports none left.
  const timeline = useMemo(() => {
    if (!hours) return []
    const busy = [
      ...bookings.map((b) => ({ ...b, kind: 'booking' as const })),
      ...blocks.map((b) => ({ ...b, kind: 'block' as const })),
    ]
    const now = new Date()
    const isToday = toDateKey(now) === dateKey
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const rows: { time: string; item: (typeof busy)[number] | null; past: boolean }[] = []
    for (let t = toMinutes(hours.open); t < toMinutes(hours.close); t += SLOT_INTERVAL) {
      const item = busy.find((b) => {
        const s = toMinutes(b.time)
        return t >= s && t < s + b.duration
      })
      rows.push({
        time: toHHMM(t),
        item: item ?? null,
        past: (isToday && t < nowMinutes) || fromDateKey(dateKey) < fromDateKey(toDateKey(now)),
      })
    }
    return rows
  }, [hours, bookings, blocks, dateKey])

  const freeSlots = hours
    ? slotsForDay(dateKey, 30, [
        ...bookings.map((b) => ({ date: b.date, time: b.time, duration: b.duration })),
        ...blocks.map((b) => ({ date: b.date, time: b.time, duration: b.duration })),
      ], schedule).filter((s) => s.available).length
    : 0

  const addBlock = async () => {
    try {
      await store.createBlock({ date: dateKey, time: blockTime, duration: blockDuration, reason: blockReason.trim() })
      setAddingBlock(false); setBlockReason('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spärra tiden')
    }
  }

  return (
    <div className="min-h-screen px-5 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto">

        <header className="flex items-center justify-between mb-10">
          <a href="/" className="flex items-center gap-2 no-underline">
            <Scissors className="w-5 h-5 text-[#d4af37]" />
            <span className="text-white text-xl font-script">Gentlemen's</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="section-label hidden sm:inline">Adminpanel</span>
            <button onClick={onLogout}
              className="border border-white/[0.1] text-white/50 text-[10px] font-bold px-4 py-2 tracking-[0.15em] uppercase bg-transparent cursor-pointer hover:border-white/25 hover:text-white/80 transition-colors">
              Logga ut
            </button>
          </div>
        </header>

        {storeMode === 'local' && (
          <p className="text-[11px] text-amber-200/70 border border-amber-200/20 bg-amber-200/[0.04] px-4 py-3 mb-8 leading-relaxed">
            Testläge — du ser bara bokningar gjorda i den här webbläsaren. Kunders bokningar
            hamnar i deras egen. Koppla en databas för att se alla på ett ställe.
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {([['day', 'Dagen'], ['schedule', 'Öppettider']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`text-[10px] font-bold px-5 py-2.5 tracking-[0.2em] uppercase border transition-all duration-300 cursor-pointer bg-transparent ${
                tab === id ? 'border-[#d4af37]/50 text-[#d4af37]' : 'border-white/[0.08] text-white/40 hover:text-white/70'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'schedule' ? (
          <ScheduleEditor schedule={schedule} onSaved={load} />
        ) : (
        <>

        {/* Fortnight strip */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-8">
          {strip.map((d) => {
            const key = toDateKey(d)
            const active = key === dateKey
            const closed = hoursFor(key, schedule) === null
            const n = weekCounts[key] ?? 0
            return (
              <button key={key} onClick={() => setDateKey(key)}
                className={`flex-shrink-0 w-16 py-2.5 border text-center transition-all duration-300 cursor-pointer bg-transparent ${
                  active ? 'border-[#d4af37]/60 bg-[#d4af37]/[0.06]' : 'border-white/[0.07] hover:border-white/20'
                } ${closed ? 'opacity-35' : ''}`}>
                <span className={`block text-[9px] uppercase tracking-widest ${active ? 'text-[#d4af37]/80' : 'text-white/35'}`}>
                  {weekdayShort(d)}
                </span>
                <span className={`block text-base font-semibold tabular-nums ${active ? 'text-[#d4af37]' : 'text-white/80'}`}>
                  {d.getDate()}
                </span>
                <span className={`block text-[9px] tabular-nums mt-0.5 ${n > 0 ? 'text-[#d4af37]/70' : 'text-white/15'}`}>
                  {closed ? '—' : n > 0 ? `${n} bok` : '·'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Day header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => shiftDay(-1)} aria-label="Föregående dag"
              className="w-9 h-9 flex items-center justify-center border border-white/[0.08] text-white/50 hover:border-white/25 bg-transparent cursor-pointer transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => shiftDay(1)} aria-label="Nästa dag"
              className="w-9 h-9 flex items-center justify-center border border-white/[0.08] text-white/50 hover:border-white/25 bg-transparent cursor-pointer transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <h1 className="hero-title text-2xl sm:text-3xl" style={{ textTransform: 'none' }}>
              {formatDateLong(dateKey)}
            </h1>
          </div>
          <button onClick={() => setDateKey(toDateKey(new Date()))}
            className="flex items-center gap-2 border border-white/[0.1] text-white/50 text-[10px] font-bold px-4 py-2 tracking-[0.15em] uppercase bg-transparent cursor-pointer hover:border-white/25 hover:text-white/80 transition-colors">
            <CalendarDays className="w-3.5 h-3.5" /> Idag
          </button>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-3 gap-2 mb-10">
          {[
            { label: 'Bokningar', value: String(bookings.length) },
            { label: 'Lediga tider', value: hours ? String(freeSlots) : '—' },
            { label: 'Omsättning', value: `${revenue} kr` },
          ].map((s) => (
            <div key={s.label} className="border border-white/[0.06] px-4 py-4">
              <p className="text-white/35 text-[9px] uppercase tracking-[0.25em] mb-2">{s.label}</p>
              <p className="text-[#d4af37] text-xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {error && <p className="text-red-300/80 text-sm mb-6">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-white/40 text-sm py-12">
            <Loader2 className="w-4 h-4 animate-spin" /> Hämtar…
          </div>
        ) : !hours ? (
          <p className="text-white/40 text-sm py-12">Stängt {formatDateLong(dateKey)}.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* Timeline */}
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mb-4">Dagen</p>
              <div className="border border-white/[0.06]">
                {timeline.map((row, i) => {
                  const startsHere = row.item && row.item.time === row.time
                  return (
                    <div key={row.time}
                      className={`flex items-stretch ${i > 0 ? 'border-t border-white/[0.04]' : ''} ${
                        row.item ? (row.item.kind === 'block' ? 'bg-white/[0.03]' : 'bg-[#d4af37]/[0.05]') : ''
                      }`}>
                      <span className="w-16 flex-shrink-0 px-3 py-2 text-[11px] tabular-nums text-white/30 border-r border-white/[0.04]">
                        {row.time}
                      </span>
                      <span className="flex-1 px-3 py-2 text-[12px] flex items-center">
                        {startsHere && row.item ? (
                          row.item.kind === 'booking' ? (
                            <span className="text-white/85">
                              <span className="text-[#d4af37] font-semibold">{(row.item as Booking).name}</span>
                              {' · '}{(row.item as Booking).serviceName}
                            </span>
                          ) : (
                            <span className="text-white/45">Spärrad{(row.item as Block).reason ? ` · ${(row.item as Block).reason}` : ''}</span>
                          )
                        ) : row.item ? (
                          <span className="text-white/15 text-[10px]">│</span>
                        ) : row.past ? (
                          <span className="text-white/12 text-[11px]">Passerad</span>
                        ) : (
                          <span className="text-white/20 text-[11px]">Ledig</span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bookings + blocks */}
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mb-4">Bokningar</p>
              {bookings.length === 0 ? (
                <p className="text-white/30 text-sm mb-10">Inga bokningar den här dagen.</p>
              ) : (
                <div className="space-y-2 mb-10">
                  {bookings.map((b) => (
                    <div key={b.id} className="border border-white/[0.07] px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white/90 text-sm font-semibold">
                            <span className="text-[#d4af37] tabular-nums mr-2">{b.time}</span>{b.name}
                          </p>
                          <p className="text-white/45 text-[12px] mt-1">
                            {b.serviceName} · {b.duration} min · {b.price} kr
                          </p>
                          <a href={`tel:${b.phone.replace(/\s|-/g, '')}`}
                            className="text-white/45 text-[12px] hover:text-[#d4af37] no-underline transition-colors">
                            {b.phone}
                          </a>
                          {b.email && <p className="text-white/30 text-[11px] break-all">{b.email}</p>}
                          {b.note && <p className="text-white/40 text-[11px] mt-1.5 italic">”{b.note}”</p>}
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm(`Avboka ${b.name} kl ${b.time}?`)) return
                            await store.cancelBooking(b.id)
                            await load()
                          }}
                          aria-label="Avboka"
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-white/[0.08] text-white/35 hover:border-red-400/40 hover:text-red-300 bg-transparent cursor-pointer transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <p className="text-white/40 text-[10px] uppercase tracking-[0.3em]">Spärrad tid</p>
                <button onClick={() => setAddingBlock((v) => !v)}
                  className="flex items-center gap-1.5 border border-white/[0.1] text-white/50 text-[10px] font-bold px-3 py-1.5 tracking-[0.15em] uppercase bg-transparent cursor-pointer hover:border-[#d4af37]/40 hover:text-[#d4af37] transition-colors">
                  <Plus className="w-3 h-3" /> Spärra
                </button>
              </div>

              {addingBlock && (
                <div className="border border-[#d4af37]/20 bg-[#d4af37]/[0.03] p-4 mb-4">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input type="time" value={blockTime} onChange={(e) => setBlockTime(e.target.value)}
                      className="bg-transparent border border-white/[0.1] px-3 py-2 text-sm text-white focus:border-[#d4af37]/50 focus:outline-none" />
                    <select value={blockDuration} onChange={(e) => setBlockDuration(Number(e.target.value))}
                      className="bg-[#0c0c0c] border border-white/[0.1] px-3 py-2 text-sm text-white focus:border-[#d4af37]/50 focus:outline-none">
                      {[15, 30, 45, 60, 90, 120, 240, 480].map((m) => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>
                  </div>
                  <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Anledning (valfritt)"
                    className="w-full bg-transparent border border-white/[0.1] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-[#d4af37]/50 focus:outline-none mb-3" />
                  <button onClick={addBlock}
                    className="w-full border border-[#d4af37]/40 text-[#d4af37] text-[10px] font-bold py-2.5 tracking-[0.2em] uppercase bg-transparent cursor-pointer hover:bg-[#d4af37] hover:text-black transition-all duration-500">
                    Spärra tiden
                  </button>
                </div>
              )}

              {blocks.length === 0 ? (
                <p className="text-white/25 text-[12px]">Inget spärrat.</p>
              ) : (
                <div className="space-y-2">
                  {blocks.map((b) => (
                    <div key={b.id} className="flex items-center justify-between border border-white/[0.06] px-4 py-2.5">
                      <span className="text-white/60 text-[12px]">
                        <span className="tabular-nums text-white/80">{b.time}</span> · {b.duration} min
                        {b.reason ? ` · ${b.reason}` : ''}
                      </span>
                      <button onClick={async () => { await store.deleteBlock(b.id); await load() }}
                        aria-label="Ta bort spärr"
                        className="w-7 h-7 flex items-center justify-center border border-white/[0.08] text-white/35 hover:border-red-400/40 hover:text-red-300 bg-transparent cursor-pointer transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
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

const WEEKDAY_NAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/**
 * Opening hours and holidays, both editable here so the barber never has to
 * touch the code to take a week off.
 */
function ScheduleEditor({ schedule, onSaved }: { schedule: Schedule; onSaved: () => Promise<void> }) {
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

  const saveWeek = async () => {
    setSaving(true); setError(null)
    try {
      await store.saveWeek(week)
      setSaved(true)
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara')
    } finally {
      setSaving(false)
    }
  }

  const addClosure = async () => {
    if (!from) return
    setError(null)
    try {
      await store.addClosure({
        from, to: to || from, reason: reason.trim(),
        open: special ? openTime : null,
        close: special ? closeTime : null,
      })
      setFrom(''); setTo(''); setReason(''); setSpecial(false)
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

      {/* Weekly hours */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-3.5 h-3.5 text-[#d4af37]/70" />
          <p className="text-white/40 text-[10px] uppercase tracking-[0.3em]">Vanliga öppettider</p>
        </div>

        <div className="border border-white/[0.06]">
          {WEEK_ORDER.map((d, i) => {
            const h = week[d]
            return (
              <div key={d} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}>
                <span className="w-20 text-[12px] text-white/70">{WEEKDAY_NAMES[d]}</span>
                {h ? (
                  <>
                    <input type="time" value={h.open} onChange={(e) => setDay(d, { open: e.target.value })}
                      className="bg-transparent border border-white/[0.1] px-2 py-1.5 text-[12px] text-white focus:border-[#d4af37]/50 focus:outline-none" />
                    <span className="text-white/25 text-xs">–</span>
                    <input type="time" value={h.close} onChange={(e) => setDay(d, { close: e.target.value })}
                      className="bg-transparent border border-white/[0.1] px-2 py-1.5 text-[12px] text-white focus:border-[#d4af37]/50 focus:outline-none" />
                  </>
                ) : (
                  <span className="flex-1 text-white/25 text-[12px]">Stängt</span>
                )}
                <button onClick={() => setDay(d, h ? null : {})}
                  className={`ml-auto text-[9px] font-bold px-3 py-1.5 tracking-[0.15em] uppercase border bg-transparent cursor-pointer transition-colors ${
                    h ? 'border-white/[0.08] text-white/35 hover:border-red-400/40 hover:text-red-300'
                      : 'border-[#d4af37]/30 text-[#d4af37]/80 hover:border-[#d4af37]/60'
                  }`}>
                  {h ? 'Stäng' : 'Öppna'}
                </button>
              </div>
            )
          })}
        </div>

        <button onClick={saveWeek} disabled={saving}
          className="w-full mt-3 border border-[#d4af37]/40 text-[#d4af37] text-[10px] font-bold py-3 tracking-[0.2em] uppercase bg-transparent cursor-pointer hover:bg-[#d4af37] hover:text-black transition-all duration-500 disabled:opacity-40">
          {saving ? 'Sparar…' : saved ? 'Sparat ✓' : 'Spara öppettider'}
        </button>
        {error && <p className="text-red-300/80 text-xs mt-3">{error}</p>}
      </div>

      {/* Closures */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarOff className="w-3.5 h-3.5 text-[#d4af37]/70" />
          <p className="text-white/40 text-[10px] uppercase tracking-[0.3em]">Semester &amp; avvikelser</p>
        </div>

        <div className="border border-[#d4af37]/15 bg-[#d4af37]/[0.02] p-4 mb-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="block">
              <span className="block text-white/35 text-[9px] uppercase tracking-[0.2em] mb-1.5">Från</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-transparent border border-white/[0.1] px-3 py-2 text-[12px] text-white focus:border-[#d4af37]/50 focus:outline-none" />
            </label>
            <label className="block">
              <span className="block text-white/35 text-[9px] uppercase tracking-[0.2em] mb-1.5">Till</span>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
                className="w-full bg-transparent border border-white/[0.1] px-3 py-2 text-[12px] text-white focus:border-[#d4af37]/50 focus:outline-none" />
            </label>
          </div>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Anledning, t.ex. Semester"
            className="w-full bg-transparent border border-white/[0.1] px-3 py-2 text-[12px] text-white placeholder:text-white/25 focus:border-[#d4af37]/50 focus:outline-none mb-3" />

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)}
              className="accent-[#d4af37]" />
            <span className="text-white/50 text-[11px]">Öppet, men andra tider</span>
          </label>

          {special && (
            <div className="flex items-center gap-2 mb-3">
              <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)}
                className="bg-transparent border border-white/[0.1] px-2 py-1.5 text-[12px] text-white focus:border-[#d4af37]/50 focus:outline-none" />
              <span className="text-white/25 text-xs">–</span>
              <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)}
                className="bg-transparent border border-white/[0.1] px-2 py-1.5 text-[12px] text-white focus:border-[#d4af37]/50 focus:outline-none" />
            </div>
          )}

          <button onClick={addClosure} disabled={!from}
            className="w-full border border-[#d4af37]/40 text-[#d4af37] text-[10px] font-bold py-2.5 tracking-[0.2em] uppercase bg-transparent cursor-pointer hover:bg-[#d4af37] hover:text-black transition-all duration-500 disabled:opacity-30">
            Lägg till
          </button>
        </div>

        {schedule.closures.length === 0 ? (
          <p className="text-white/25 text-[12px]">Inga inlagda perioder.</p>
        ) : (
          <div className="space-y-2">
            {schedule.closures.map((c) => (
              <div key={c.id} className="flex items-center justify-between border border-white/[0.06] px-4 py-2.5">
                <span className="text-[12px]">
                  <span className="text-white/80 tabular-nums">
                    {c.from}{c.to !== c.from ? ` – ${c.to}` : ''}
                  </span>
                  <span className="text-white/40">
                    {' · '}{c.open && c.close ? `${c.open}–${c.close}` : 'Stängt'}
                    {c.reason ? ` · ${c.reason}` : ''}
                  </span>
                </span>
                <button onClick={async () => { await store.deleteClosure(c.id); await onSaved() }}
                  aria-label="Ta bort"
                  className="w-7 h-7 flex items-center justify-center border border-white/[0.08] text-white/35 hover:border-red-400/40 hover:text-red-300 bg-transparent cursor-pointer transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
