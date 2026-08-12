import type { WeekHours } from './types'

export type Service = {
  id: string
  name: string
  price: number
  /** Minutes in the chair. Drives which start times can still fit. */
  duration: number
}

export type BookingConfig = {
  /** Shown in the admin panel header. */
  businessName: string
  /** Offered as a fallback wherever booking online is not enough. */
  phone: string
  currency: string
  services: Service[]
  /** Hours used until someone saves a schedule from the panel. */
  defaultWeek: WeekHours
  /** How far apart start times are offered. */
  slotInterval: number
  /** Minimum gap between two appointments. */
  bufferMinutes: number
  /** How soon from now a customer may book. */
  minAdvanceHours: number
  /** How far ahead the calendar opens. */
  maxAdvanceDays: number
  /** Password for the panel in local mode. Ignored once Supabase is set up,
   *  where a real sign-in replaces it. */
  localPassword: string
}

const DEFAULTS: BookingConfig = {
  businessName: 'Salongen',
  phone: '',
  currency: 'kr',
  services: [
    { id: 'klippning', name: 'Klippning', price: 300, duration: 30 },
  ],
  defaultWeek: {
    0: null,
    1: { open: '10:00', close: '18:00' },
    2: { open: '10:00', close: '18:00' },
    3: { open: '10:00', close: '18:00' },
    4: { open: '10:00', close: '18:00' },
    5: { open: '10:00', close: '18:00' },
    6: { open: '10:00', close: '15:00' },
  },
  slotInterval: 15,
  bufferMinutes: 5,
  minAdvanceHours: 2,
  maxAdvanceDays: 60,
  localPassword: 'admin',
}

/**
 * Fills in everything you did not set.
 *
 * Call once per site and pass the result to both components, so the booking
 * form and the panel agree on the rules — they compute availability from the
 * same numbers, and disagreement there means double bookings.
 */
export function createBookingConfig(partial: Partial<BookingConfig>): BookingConfig {
  return { ...DEFAULTS, ...partial }
}
