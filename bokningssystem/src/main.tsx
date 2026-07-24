import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BookingCalendar from './BookingCalendar'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BookingCalendar />
  </StrictMode>,
)
