export type Booking = {
  id: string
  /** YYYY-MM-DD, local time. */
  date: string
  /** HH:MM, 24h, local time. */
  time: string
  serviceId: string
  serviceName: string
  price: number
  duration: number
  name: string
  phone: string
  email: string
  note: string
  createdAt: string
  cancelled: boolean
}

/** Time the barber takes out of the day: lunch, an errand, a day off. */
export type Block = {
  id: string
  date: string
  time: string
  duration: number
  reason: string
}

/** Anything occupying the chair, whichever of the two it came from. */
export type Busy = { date: string; time: string; duration: number }

/** Opening hours per weekday, keyed by getDay(). null means closed. */
export type WeekHours = Record<number, { open: string; close: string } | null>

/**
 * A stretch of days that does not follow the weekly pattern.
 *
 * With open and close null the range is shut — a holiday, a week off. With
 * them set the range keeps different hours, which covers the short day
 * before a red day without needing a second concept.
 */
export type Closure = {
  id: string
  from: string
  to: string
  reason: string
  open: string | null
  close: string | null
}

export type Schedule = { week: WeekHours; closures: Closure[] }
