import { BUFFER_MINUTES, MIN_ADVANCE_HOURS, OPENING_HOURS, SLOT_INTERVAL } from './config'
import type { Busy } from './types'

/** Minutes since midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** YYYY-MM-DD in local time. Deliberately not toISOString, which is UTC
 *  and rolls the date over for anyone east of Greenwich in the evening. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Two appointments clash unless there is at least BUFFER_MINUTES between
 *  them. Touching end-to-start is a clash; the barber needs the gap. */
function clashes(aStart: number, aDuration: number, bStart: number, bDuration: number): boolean {
  const aEnd = aStart + aDuration
  const bEnd = bStart + bDuration
  return aStart < bEnd + BUFFER_MINUTES && bStart < aEnd + BUFFER_MINUTES
}

export type Slot = {
  time: string
  /** False when it clashes with something already in the book, or when it
   *  runs past closing, or when it is too soon from now. */
  available: boolean
  reason?: 'taken' | 'past' | 'closing'
}

/**
 * Every start time on the grid for one day, each marked free or not.
 *
 * Returns the full grid rather than only the free times so the UI can show
 * what is taken — seeing a day fill up is the point.
 */
export function slotsForDay(
  dateKey: string,
  serviceDuration: number,
  busy: Busy[],
  now: Date = new Date(),
): Slot[] {
  const date = fromDateKey(dateKey)
  const hours = OPENING_HOURS[date.getDay()]
  if (!hours) return []

  const open = toMinutes(hours.open)
  const close = toMinutes(hours.close)
  const sameDay = toDateKey(now) === dateKey
  const earliest = sameDay
    ? now.getHours() * 60 + now.getMinutes() + MIN_ADVANCE_HOURS * 60
    : -Infinity

  const taken = busy
    .filter((b) => b.date === dateKey)
    .map((b) => ({ start: toMinutes(b.time), duration: b.duration }))

  const slots: Slot[] = []
  for (let t = open; t + serviceDuration <= close; t += SLOT_INTERVAL) {
    if (t < earliest) {
      slots.push({ time: toHHMM(t), available: false, reason: 'past' })
      continue
    }
    const hit = taken.some((b) => clashes(t, serviceDuration, b.start, b.duration))
    slots.push(hit ? { time: toHHMM(t), available: false, reason: 'taken' } : { time: toHHMM(t), available: true })
  }
  return slots
}

/** Days the calendar should offer, from today forward. */
export function upcomingDays(count: number, from: Date = new Date()): Date[] {
  const out: Date[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    out.push(d)
  }
  return out
}

export function isOpen(d: Date): boolean {
  return OPENING_HOURS[d.getDay()] !== null
}

const WEEKDAYS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tors', 'Fre', 'Lör']
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

export function weekdayShort(d: Date): string {
  return WEEKDAYS[d.getDay()]
}

export function formatDateLong(key: string): string {
  const d = fromDateKey(key)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}
