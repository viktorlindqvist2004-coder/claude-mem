import emailjs from '@emailjs/browser'
import { OWNER_EMAIL } from './config'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || ''
const CUSTOMER_TEMPLATE = import.meta.env.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID || ''
const OWNER_TEMPLATE = import.meta.env.VITE_EMAILJS_OWNER_TEMPLATE_ID || ''
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''

export function emailConfigured(): boolean {
  return !!(SERVICE_ID && CUSTOMER_TEMPLATE && OWNER_TEMPLATE && PUBLIC_KEY)
}

interface BookingEmailData {
  id: string
  name: string
  email: string
  phone: string
  service: string
  price: string
  date: string
  time: string
  endTime: string
  duration: number
  dayName: string
}

export async function sendBookingEmails(data: BookingEmailData) {
  if (!emailConfigured()) {
    console.log('[Bokning] E-post ej konfigurerad. Detaljer:', data)
    return
  }

  const dateStr = `${data.dayName} ${data.date}`
  const timeStr = `${data.time} – ${data.endTime}`

  try {
    await emailjs.send(SERVICE_ID, CUSTOMER_TEMPLATE, {
      to_email: data.email,
      to_name: data.name,
      service_name: data.service,
      booking_date: dateStr,
      booking_time: timeStr,
      booking_duration: `${data.duration} min`,
      booking_price: data.price,
      booking_id: data.id,
    }, PUBLIC_KEY)
  } catch (err) {
    console.error('[Bokning] Kundmail misslyckades:', err)
  }

  try {
    await emailjs.send(SERVICE_ID, OWNER_TEMPLATE, {
      to_email: OWNER_EMAIL,
      customer_name: data.name,
      customer_email: data.email,
      customer_phone: data.phone,
      service_name: data.service,
      booking_date: dateStr,
      booking_time: timeStr,
      booking_duration: `${data.duration} min`,
      booking_price: data.price,
      booking_id: data.id,
    }, PUBLIC_KEY)
  } catch (err) {
    console.error('[Bokning] Ägarmail misslyckades:', err)
  }
}

export async function sendCancellationEmails(data: BookingEmailData) {
  if (!emailConfigured()) {
    console.log('[Bokning] Avbokning (e-post ej konfigurerad):', data)
    return
  }

  const dateStr = `${data.dayName} ${data.date}`
  const cancelled = `AVBOKAD: ${data.service}`

  try {
    await emailjs.send(SERVICE_ID, CUSTOMER_TEMPLATE, {
      to_email: data.email,
      to_name: data.name,
      service_name: cancelled,
      booking_date: dateStr,
      booking_time: data.time,
      booking_duration: `${data.duration} min`,
      booking_price: data.price,
      booking_id: `${data.id} (avbokad)`,
    }, PUBLIC_KEY)
  } catch (err) {
    console.error('[Bokning] Avbokningsmail misslyckades:', err)
  }

  try {
    await emailjs.send(SERVICE_ID, OWNER_TEMPLATE, {
      to_email: OWNER_EMAIL,
      customer_name: data.name,
      customer_email: data.email,
      customer_phone: data.phone,
      service_name: cancelled,
      booking_date: dateStr,
      booking_time: data.time,
      booking_duration: `${data.duration} min`,
      booking_price: data.price,
      booking_id: `${data.id} (avbokad)`,
    }, PUBLIC_KEY)
  } catch (err) {
    console.error('[Bokning] Avbokningsmail till ägare misslyckades:', err)
  }
}
