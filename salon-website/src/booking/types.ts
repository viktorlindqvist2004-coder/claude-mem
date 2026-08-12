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
