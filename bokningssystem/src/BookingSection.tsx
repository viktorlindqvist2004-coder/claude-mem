import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BookingConfig, Service } from './config'
import {
  defaultSchedule, formatDateLong, isOpen, slotsForDay, toDateKey, upcomingDays, weekdayShort,
} from './availability'
import { createStore, storeMode } from './store'
import type { Busy, Schedule } from './types'

const DAYS_PER_PAGE = 7

export type BookingSectionProps = {
  config: BookingConfig
  /** Anchor for links from a nav. Defaults to "booking". */
  id?: string
  /** Runs after a booking is stored — send a confirmation mail here. */
  onBooked?: (booking: { date: string; time: string; service: Service; name: string; phone: string }) => void
}

export default function BookingSection({ config, id = 'booking', onBooked }: BookingSectionProps) {
  const store = useMemo(() => createStore(config), [config])

  const [service, setService] = useState<Service | null>(null)
  const [page, setPage] = useState(0)
  const [dateKey, setDateKey] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)

  const [busy, setBusy] = useState<Busy[]>([])
  const [schedule, setSchedule] = useState<Schedule>(() => defaultSchedule(config))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ date: string; time: string } | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')

  const openDays = useMemo(
    () => upcomingDays(config.maxAdvanceDays).filter((d) => isOpen(d, schedule)),
    [schedule, config.maxAdvanceDays],
  )
  const days = useMemo(
    () => openDays.slice(page * DAYS_PER_PAGE, page * DAYS_PER_PAGE + DAYS_PER_PAGE),
    [openDays, page],
  )
  const maxPage = Math.max(0, Math.ceil(openDays.length / DAYS_PER_PAGE) - 1)

  /**
   * Fetches the whole bookable window at once.
   *
   * The range deliberately does not come from the days on screen. Those are
   * derived from the schedule, and this sets the schedule — every fetch
   * returns a fresh object, so a range depending on it would give this
   * callback a new identity, re-run the effect and fetch again, forever.
   * That loop shipped once and ran ~750 times a second. Keep the deps empty.
   */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const last = new Date()
      last.setDate(last.getDate() + config.maxAdvanceDays)
      const [b, sch] = await Promise.all([
        store.listBusy(toDateKey(new Date()), toDateKey(last)),
        store.getSchedule(),
      ])
      setBusy(b)
      setSchedule(sch)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta tider')
    } finally {
      setLoading(false)
    }
  }, [store, config.maxAdvanceDays])

  useEffect(() => { void load() }, [load])

  const slots = useMemo(
    () => (dateKey && service ? slotsForDay(dateKey, service.duration, busy, schedule, config) : []),
    [dateKey, service, busy, schedule, config],
  )
  const freeCount = slots.filter((s) => s.available).length

  const submit = async () => {
    if (!service || !dateKey || !time || !name.trim() || !phone.trim()) return
    setSaving(true)
    setError(null)
    try {
      // Re-check against fresh data: the grid may be minutes old.
      const fresh = await store.listBusy(dateKey, dateKey)
      if (!slotsForDay(dateKey, service.duration, fresh, schedule, config).find((s) => s.time === time)?.available) {
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
      onBooked?.({ date: dateKey, time, service, name: name.trim(), phone: phone.trim() })
      setDone({ date: dateKey, time })
      setName(''); setPhone(''); setEmail(''); setNote('')
      setTime(null)
      await load()
    } catch (e) {
      setError(
        e instanceof Error && e.message === 'SLOT_TAKEN'
          ? 'Den tiden hann bli bokad. Välj en annan.'
          : 'Något gick fel. Försök igen.',
      )
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <section id={id} className="bk bk-section">
        <div className="bk-wrap bk-center" style={{ maxWidth: '28rem' }}>
          <div className="bk-check" aria-hidden>✓</div>
          <h2 className="bk-title" style={{ fontSize: 'clamp(1.5rem,4vw,2rem)' }}>Tiden är din</h2>
          <p style={{ margin: '1rem 0 .5rem' }}>{formatDateLong(done.date)} kl {done.time}</p>
          <p className="bk-note" style={{ marginBottom: '2rem' }}>
            Vi ses!{config.phone ? ` Behöver du ändra, ring ${config.phone}.` : ''}
          </p>
          <button className="bk-btn" onClick={() => { setDone(null); setService(null); setDateKey(null) }}>
            Boka en till tid
          </button>
        </div>
      </section>
    )
  }

  return (
    <section id={id} className="bk bk-section">
      <div className="bk-wrap">
        <div className="bk-center" style={{ marginBottom: '3rem' }}>
          <p className="bk-eyebrow">Boka online</p>
          <h2 className="bk-title">Välj din tid</h2>
          <div className="bk-rule" />
        </div>

        {storeMode === 'local' && (
          <p className="bk-warn">
            Testläge — bokningar sparas bara i den här webbläsaren och når inte salongen.
            Koppla en databas för att ta emot riktiga bokningar.
            {config.phone ? ` Ring ${config.phone} så länge.` : ''}
          </p>
        )}

        {/* 1 — service */}
        <p className="bk-step">1 · Tjänst</p>
        <div className="bk-grid bk-grid--services">
          {config.services.map((s) => (
            <button key={s.id} type="button" className="bk-choice"
              aria-pressed={service?.id === s.id}
              onClick={() => { setService(s); setTime(null) }}>
              <span>
                <span className="bk-choice-name">{s.name}</span>
                <span className="bk-choice-meta">{s.duration} min</span>
              </span>
              <span className="bk-choice-price">{s.price} {config.currency}</span>
            </button>
          ))}
        </div>

        {/* 2 — day */}
        <div className={service ? undefined : 'bk-locked'}>
          <div className="bk-row" style={{ marginBottom: '1rem' }}>
            <p className="bk-step" style={{ margin: 0 }}>2 · Dag</p>
            <div className="bk-row bk-row--tight">
              <button type="button" className="bk-icon-btn" aria-label="Tidigare dagar"
                disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>‹</button>
              <button type="button" className="bk-icon-btn" aria-label="Senare dagar"
                disabled={page >= maxPage} onClick={() => setPage((p) => Math.min(maxPage, p + 1))}>›</button>
            </div>
          </div>

          <div className="bk-grid bk-grid--days">
            {days.map((d) => {
              const key = toDateKey(d)
              return (
                <button key={key} type="button" className="bk-day" aria-pressed={dateKey === key}
                  onClick={() => { setDateKey(key); setTime(null) }}>
                  <span className="bk-day-name">{weekdayShort(d)}</span>
                  <span className="bk-day-num">{d.getDate()}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3 — time */}
        <div className={dateKey && service ? undefined : 'bk-locked'}>
          <div className="bk-row" style={{ marginBottom: '1rem' }}>
            <p className="bk-step" style={{ margin: 0 }}>3 · Tid</p>
            <div className="bk-legend">
              <span><i className="bk-swatch" /> Ledig</span>
              <span><i className="bk-swatch bk-swatch--taken" /> Upptagen</span>
            </div>
          </div>

          {loading ? (
            <p className="bk-note" style={{ padding: '2rem 0' }}>Hämtar tider…</p>
          ) : slots.length === 0 ? (
            <p className="bk-note" style={{ padding: '2rem 0' }}>Välj en dag ovan.</p>
          ) : freeCount === 0 ? (
            <p className="bk-note" style={{ padding: '2rem 0' }}>
              Fullbokat {dateKey ? formatDateLong(dateKey) : ''}. Prova en annan dag
              {config.phone ? `, eller ring ${config.phone}` : ''}.
            </p>
          ) : (
            <>
              <div className="bk-grid bk-grid--times">
                {slots.map((s) => (
                  <button key={s.time} type="button" className="bk-slot"
                    aria-pressed={time === s.time} disabled={!s.available}
                    title={s.reason === 'taken' ? 'Upptagen' : s.reason === 'past' ? 'För kort varsel' : undefined}
                    onClick={() => setTime(s.time)}>
                    {s.time}
                  </button>
                ))}
              </div>
              <p className="bk-note" style={{ margin: '.75rem 0 3rem' }}>
                {freeCount} lediga tider {dateKey ? formatDateLong(dateKey) : ''}
              </p>
            </>
          )}
        </div>

        {/* 4 — details */}
        <div className={time ? undefined : 'bk-locked'}>
          <p className="bk-step">4 · Dina uppgifter</p>
          <div className="bk-fields">
            <input className="bk-field" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Namn *" autoComplete="name" />
            <input className="bk-field" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefon *" type="tel" autoComplete="tel" />
            <input className="bk-field bk-span2" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="E-post" type="email" autoComplete="email" />
            <input className="bk-field bk-span2" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Önskemål (valfritt)" />
          </div>

          {service && dateKey && time && (
            <p className="bk-note" style={{ marginTop: '1.5rem' }}>
              {service.name} · {formatDateLong(dateKey)} kl {time} ·{' '}
              <span style={{ color: 'var(--bk-accent)' }}>{service.price} {config.currency}</span>
            </p>
          )}

          {error && <p className="bk-error">{error}</p>}

          <div className="bk-actions">
            <button type="button" className="bk-btn" onClick={submit}
              disabled={saving || !name.trim() || !phone.trim()}>
              {saving ? 'Bokar…' : 'Bekräfta bokning'}
            </button>
            {config.phone && (
              <a className="bk-btn bk-btn--ghost" href={`tel:${config.phone.replace(/\s|-/g, '')}`}>
                Ring istället
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
