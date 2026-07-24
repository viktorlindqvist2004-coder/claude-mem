export interface Service {
  name: string
  price: string
  duration: number
}

export const BUSINESS_NAME = import.meta.env.VITE_BUSINESS_NAME || 'Mitt Företag'
export const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || 'info@example.com'

export const SERVICES: Service[] = [
  { name: 'Herrklippning', price: '300 kr', duration: 30 },
  { name: 'Skinfade', price: '350 kr', duration: 45 },
  { name: 'Skägg', price: '200 kr', duration: 20 },
  { name: 'Klippning + Skägg', price: '450 kr', duration: 60 },
  { name: 'Lyxbehandling Skägg', price: '299 kr', duration: 45 },
  { name: 'Ansiktsbehandling', price: '470 kr', duration: 60 },
]

export const OPENING_HOURS: Record<number, { open: number; close: number } | null> = {
  1: { open: 10, close: 18 },  // Måndag
  2: { open: 10, close: 18 },  // Tisdag
  3: { open: 10, close: 18 },  // Onsdag
  4: { open: 10, close: 18 },  // Torsdag
  5: { open: 10, close: 18 },  // Fredag
  6: { open: 10, close: 15 },  // Lördag
  0: null,                      // Söndag — stängt
}

export const SLOT_INTERVAL = 30     // minuter per slot
export const BUFFER_MINUTES = 10    // paus mellan bokningar
export const MIN_ADVANCE_HOURS = 2  // minst X timmar i förväg
export const MAX_ADVANCE_WEEKS = 4  // max X veckor framåt
