import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Loader2, Phone } from 'lucide-react'
import { CONTACT_PHONE, MAX_ADVANCE_DAYS, SERVICES, type Service } from './config'
import { DEFAULT_SCHEDULE, formatDateLong, isOpen, slotsForDay, toDateKey, upcomingDays, weekdayShort } from './availability'
import { store, storeMode } from './store'
import type { Busy, Schedule } from './types'

const DAYS_PER_PAGE = 7

export default function BookingSection() {
  const [service, setService] = useState<Service | null>(null)
  const [page, setPage] = useState(0)
  const [dateKey, setDateKey] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)

  const [busy, setBusy] = useState<Busy[]>([])
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ date: string; time: string } | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')

  // Days the shop is actually open, holidays already taken out.
  const openDays = useMemo(
    () => upcomingDays(MAX_ADVANCE_DAYS).filter((d) => isOpen(d, schedule)),
    [schedule],
  )
  const days = useMemo(
    () => openDays.slice(page * DAYS_PER_PAGE, page * DAYS_PER_PAGE + DAYS_PER_PAGE),
    [openDays, page],
  )
  const maxPage = Math.max(0, Math.ceil(openDays.length / DAYS_PER_PAGE) - 1)

  const load = useCallback(async () => {
    if (days.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const from = toDateKey(days[0])
      const to = toDateKey(days[days.length - 1])
      const [b, sch] = await Promise.all([store.listBusy(from, to), store.getSchedule()])
      setBusy(b)
      setSchedule(sch)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta tider')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { void load() }, [load])

  const slots = useMemo(
    () => (dateKey && service ? slotsForDay(dateKey, service.duration, busy, schedule) : []),
    [dateKey, service, busy, schedule],
  )
  const freeCount = slots.filter((s) => s.available).length

  const submit = async () => {
    if (!service || !dateKey || !time || !name.trim() || !phone.trim()) return
    setSaving(true)
    setError(null)
    try {
      // Re-check against fresh data: the grid may be a few minutes old.
      const check = slotsForDay(dateKey, service.duration, await store.listBusy(dateKey, dateKey), schedule)
      if (!check.find((s) => s.time === time)?.available) {
        setError('Den tiden hann bli bokad. Välj en annan.')
        setTime(null)
        await load()
        return
      }

      await store.createBooking({
        date: dateKey, time,
        serviceId: service.id, serviceName: service.name,
        price: service.price, duration: service.duration,
        name: name.trim(), phone: phone.trim(), email: email.trim(), note: note.trim(),
      })
      setDone({ date: dateKey, time })
      setName(''); setPhone(''); setEmail(''); setNote('')
      setTime(null)
      await load()
    } catch (e) {
      setError(
        e instanceof Error && e.message === 'SLOT_TAKEN'
          ? 'Den tiden hann bli bokad. Välj en annan.'
          : 'Något gick fel. Ring oss så löser vi det.',
      )
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <section id="booking" className="relative py-24 sm:py-32 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-14 h-14 rounded-full border border-[#d4af37]/40 flex items-center justify-center mx-auto mb-6">
            <Check className="w-6 h-6 text-[#d4af37]" />
          </div>
          <h2 className="hero-title text-3xl sm:text-4xl mb-4">Tiden är din</h2>
          <p className="text-white/70 text-base mb-2">{formatDateLong(done.date)} kl {done.time}</p>
          <p className="text-white/40 text-sm mb-8">Vi ses på Edsgatan 23. Behöver du ändra, ring {CONTACT_PHONE}.</p>
          <button onClick={() => { setDone(null); setService(null); setDateKey(null) }}
            className="border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold px-8 py-3.5 tracking-[0.2em] uppercase bg-transparent cursor-pointer hover:bg-[#d4af37] hover:text-black transition-all duration-500">
            Boka en till tid
          </button>
        </div>
      </section>
    )
  }

  return (
    <section id="booking" className="relative py-24 sm:py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="section-label mb-4">Boka online</p>
          <h2 className="hero-title text-4xl sm:text-5xl md:text-6xl" style={{ textTransform: 'none', paddingTop: '0.15em' }}>
            VÄLJ DIN TID
          </h2>
          <div className="gold-line active" />
        </div>

        {storeMode === 'local' && (
          <p className="text-[11px] text-amber-200/70 border border-amber-200/20 bg-amber-200/[0.04] px-4 py-3 mb-8 leading-relaxed">
            Testläge — bokningar sparas bara i den här webbläsaren och når inte salongen.
            Koppla en databas för att ta emot riktiga bokningar. Ring {CONTACT_PHONE} så länge.
          </p>
        )}

        {/* 1 — service */}
        <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mb-4">1 · Tjänst</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-12">
          {SERVICES.map((s) => {
            const active = service?.id === s.id
            return (
              <button key={s.id}
                onClick={() => { setService(s); setTime(null) }}
                className={`flex items-center justify-between text-left px-5 py-4 border transition-all duration-300 cursor-pointer bg-transparent ${
                  active ? 'border-[#d4af37]/60 bg-[#d4af37]/[0.06]' : 'border-white/[0.08] hover:border-white/20'
                }`}>
                <span>
                  <span className={`block text-sm font-semibold ${active ? 'text-[#d4af37]' : 'text-white/85'}`}>{s.name}</span>
                  <span className="block text-white/35 text-[11px] mt-0.5">{s.duration} min</span>
                </span>
                <span className={`text-sm font-bold tabular-nums ${active ? 'text-[#d4af37]' : 'text-white/60'}`}>{s.price} kr</span>
              </button>
            )
          })}
        </div>

        {/* 2 — day */}
        <div className={service ? '' : 'opacity-30 pointer-events-none'}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em]">2 · Dag</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="w-8 h-8 flex items-center justify-center border border-white/[0.08] text-white/50 disabled:opacity-25 hover:border-white/25 bg-transparent cursor-pointer transition-colors"
                aria-label="Tidigare dagar">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
                className="w-8 h-8 flex items-center justify-center border border-white/[0.08] text-white/50 disabled:opacity-25 hover:border-white/25 bg-transparent cursor-pointer transition-colors"
                aria-label="Senare dagar">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-12">
            {days.map((d) => {
              const key = toDateKey(d)
              const active = dateKey === key
              return (
                <button key={key}
                  onClick={() => { setDateKey(key); setTime(null) }}
                  className={`py-3 border text-center transition-all duration-300 cursor-pointer bg-transparent ${
                    active ? 'border-[#d4af37]/60 bg-[#d4af37]/[0.06]' : 'border-white/[0.08] hover:border-white/20'
                  }`}>
                  <span className={`block text-[10px] uppercase tracking-widest ${active ? 'text-[#d4af37]/80' : 'text-white/35'}`}>
                    {weekdayShort(d)}
                  </span>
                  <span className={`block text-lg font-semibold tabular-nums mt-1 ${active ? 'text-[#d4af37]' : 'text-white/80'}`}>
                    {d.getDate()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3 — time */}
        <div className={dateKey && service ? '' : 'opacity-30 pointer-events-none'}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em]">3 · Tid</p>
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-white/45">
                <span className="w-2.5 h-2.5 border border-[#d4af37]/50 inline-block" /> Ledig
              </span>
              <span className="flex items-center gap-1.5 text-white/25">
                <span className="w-2.5 h-2.5 border border-white/10 bg-white/[0.04] inline-block" /> Upptagen
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-white/40 text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin" /> Hämtar tider…
            </div>
          ) : slots.length === 0 ? (
            <p className="text-white/40 text-sm py-8">Välj en dag ovan.</p>
          ) : freeCount === 0 ? (
            <p className="text-white/50 text-sm py-8">
              Fullbokat {dateKey ? formatDateLong(dateKey) : ''}. Prova en annan dag, eller ring {CONTACT_PHONE}.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {slots.map((s) => {
                  const active = time === s.time
                  return (
                    <button key={s.time} disabled={!s.available}
                      onClick={() => setTime(s.time)}
                      title={s.reason === 'taken' ? 'Upptagen' : s.reason === 'past' ? 'För kort varsel' : undefined}
                      className={`py-2.5 text-sm font-medium tabular-nums border transition-all duration-200 bg-transparent ${
                        active
                          ? 'border-[#d4af37] bg-[#d4af37] text-black cursor-pointer'
                          : s.available
                            ? 'border-[#d4af37]/35 text-[#d4af37] hover:bg-[#d4af37]/10 cursor-pointer'
                            : 'border-white/[0.06] bg-white/[0.03] text-white/20 cursor-not-allowed line-through'
                      }`}>
                      {s.time}
                    </button>
                  )
                })}
              </div>
              <p className="text-white/30 text-[11px] mb-12">{freeCount} lediga tider {dateKey ? formatDateLong(dateKey) : ''}</p>
            </>
          )}
        </div>

        {/* 4 — details */}
        <div className={time ? '' : 'opacity-30 pointer-events-none'}>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] mb-4">4 · Dina uppgifter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Namn *" autoComplete="name"
              className="bg-transparent border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#d4af37]/50 focus:outline-none transition-colors" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon *" type="tel" autoComplete="tel"
              className="bg-transparent border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#d4af37]/50 focus:outline-none transition-colors" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post" type="email" autoComplete="email"
              className="bg-transparent border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#d4af37]/50 focus:outline-none transition-colors sm:col-span-2" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Önskemål (valfritt)"
              className="bg-transparent border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#d4af37]/50 focus:outline-none transition-colors sm:col-span-2" />
          </div>

          {service && dateKey && time && (
            <p className="text-white/45 text-sm mt-6">
              {service.name} · {formatDateLong(dateKey)} kl {time} · <span className="text-[#d4af37]">{service.price} kr</span>
            </p>
          )}

          {error && <p className="text-red-300/80 text-sm mt-4">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button onClick={submit} disabled={saving || !name.trim() || !phone.trim()}
              className="flex items-center justify-center gap-2 border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold px-10 py-4 tracking-[0.2em] uppercase bg-transparent cursor-pointer hover:bg-[#d4af37] hover:text-black transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Bokar…</> : 'Bekräfta bokning'}
            </button>
            <a href={`tel:${CONTACT_PHONE.replace(/\s|-/g, '')}`}
              className="flex items-center justify-center gap-2 border border-white/15 text-white/50 text-xs font-bold px-10 py-4 tracking-[0.15em] uppercase hover:bg-white/10 hover:text-white transition-all duration-500 no-underline">
              <Phone className="w-3.5 h-3.5" /> Ring istället
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
