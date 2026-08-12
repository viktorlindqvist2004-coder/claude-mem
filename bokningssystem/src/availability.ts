import type { BookingConfig } from './config'
import type { Busy, Schedule } from './types'

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

/** YYYY-MM-DD in local time. Deliberately not toISOString, which is UTC and
 *  rolls the date over for anyone east of Greenwich in the evening. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * The hours a given date actually keeps.
 *
 * A closure covering the date wins over the weekly pattern, so a week of
 * holiday shuts those days without touching the normal schedule.
 */
export function hoursFor(dateKey: string, schedule: Schedule): { open: string; close: string } | null {
  const closure = schedule.closures.find((c) => dateKey >= c.from && dateKey <= c.to)
  if (closure) return closure.open && closure.close ? { open: closure.open, close: closure.close } : null
  return schedule.week[fromDateKey(dateKey).getDay()] ?? null
}

export function defaultSchedule(config: BookingConfig): Schedule {
  return { week: config.defaultWeek, closures: [] }
}

export type Slot = {
  time: string
  available: boolean
  reason?: 'taken' | 'past'
}

/** Two appointments clash unless there is at least the buffer between them.
 *  Touching end-to-start is a clash; the chair needs the gap. */
function clashes(aStart: number, aDur: number, bStart: number, bDur: number, buffer: number): boolean {
  return aStart < bStart + bDur + buffer && bStart < aStart + aDur + buffer
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
  schedule: Schedule,
  config: BookingConfig,
  now: Date = new Date(),
): Slot[] {
  const hours = hoursFor(dateKey, schedule)
  if (!hours) return []

  const open = toMinutes(hours.open)
  const close = toMinutes(hours.close)
  const earliest = toDateKey(now) === dateKey
    ? now.getHours() * 60 + now.getMinutes() + config.minAdvanceHours * 60
    : -Infinity

  const taken = busy
    .filter((b) => b.date === dateKey)
    .map((b) => ({ start: toMinutes(b.time), duration: b.duration }))

  const slots: Slot[] = []
  for (let t = open; t + serviceDuration <= close; t += config.slotInterval) {
    if (t < earliest) {
      slots.push({ time: toHHMM(t), available: false, reason: 'past' })
      continue
    }
    const hit = taken.some((b) => clashes(t, serviceDuration, b.start, b.duration, config.bufferMinutes))
    slots.push(hit ? { time: toHHMM(t), available: false, reason: 'taken' } : { time: toHHMM(t), available: true })
  }
  return slots
}

export function upcomingDays(count: number, from: Date = new Date()): Date[] {
  const out: Date[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    out.push(d)
  }
  return out
}

export function isOpen(d: Date, schedule: Schedule): boolean {
  return hoursFor(toDateKey(d), schedule) !== null
}

const WEEKDAYS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tors', 'Fre', 'Lör']
export const WEEKDAY_NAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

export function weekdayShort(d: Date): string {
  return WEEKDAYS[d.getDay()]
}

export function formatDateLong(key: string): string {
  const d = fromDateKey(key)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}
