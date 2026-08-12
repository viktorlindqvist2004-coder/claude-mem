/* Demo: hur en sida använder paketet. Kör med `npm run demo`. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AdminPanel, BookingSection, createBookingConfig } from '../src'
import '../src/booking.css'

const config = createBookingConfig({
  businessName: 'Demo Salong',
  phone: '070-000 00 00',
  localPassword: 'demo',
  services: [
    { id: 'klipp', name: 'Klippning', price: 300, duration: 30 },
    { id: 'fade', name: 'Skinfade', price: 350, duration: 45 },
    { id: 'skagg', name: 'Skägg', price: 200, duration: 20 },
  ],
})

const isAdmin = location.pathname.replace(/\/+$/, '') === '/admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? <AdminPanel config={config} /> : <BookingSection config={config} />}
  </StrictMode>,
)
