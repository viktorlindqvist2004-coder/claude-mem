export type Service = {
  id: string
  name: string
  price: number
  /** Minutes in the chair. Drives which start times can still fit. */
  duration: number
}

export const SERVICES: Service[] = [
  { id: 'herrklippning', name: 'Herrklippning', price: 300, duration: 30 },
  { id: 'skinfade', name: 'Skinfade', price: 350, duration: 45 },
  { id: 'skagg', name: 'Skägg', price: 200, duration: 20 },
  { id: 'klipp-skagg', name: 'Klippning + Skägg', price: 450, duration: 60 },
  { id: 'lyx-skagg', name: 'Lyxbehandling Skägg', price: 299, duration: 45 },
  { id: 'ansikte', name: 'Ansiktsbehandling', price: 470, duration: 60 },
]

/** Keyed by JS getDay(): 0 = Sunday. null means closed. */
export const OPENING_HOURS: Record<number, { open: string; close: string } | null> = {
  0: null,
  1: { open: '10:00', close: '18:00' },
  2: { open: '10:00', close: '18:00' },
  3: { open: '10:00', close: '18:00' },
  4: { open: '10:00', close: '18:00' },
  5: { open: '10:00', close: '18:00' },
  6: { open: '10:00', close: '15:00' },
}

/** Start times are offered on this grid. */
export const SLOT_INTERVAL = 15
/** Minimum gap between two appointments. */
export const BUFFER_MINUTES = 5
/** How soon someone may book from now. */
export const MIN_ADVANCE_HOURS = 2
/** How far ahead the calendar opens. */
export const MAX_ADVANCE_DAYS = 60

export const CONTACT_PHONE = '076-214 99 29'
