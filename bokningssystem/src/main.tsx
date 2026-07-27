import { StrictMode, useState, useEffect, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import BookingCalendar from './BookingCalendar'
import AdminPanel from './AdminPanel'
import './index.css'

const ADMIN_PIN = '2004'
const PIN_LENGTH = 4

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''))
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const checkPin = useCallback((newDigits: string[]) => {
    const code = newDigits.join('')
    if (code.length === PIN_LENGTH) {
      if (code === ADMIN_PIN) {
        sessionStorage.setItem('admin_unlocked', '1')
        onUnlock()
      } else {
        setError(true)
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setDigits(Array(PIN_LENGTH).fill(''))
          inputRefs.current[0]?.focus()
        }, 500)
      }
    }
  }, [onUnlock])

  const handleChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setError(false)
    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)

    if (digit && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    checkPin(newDigits)
  }, [digits, checkPin])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits]
      newDigits[index - 1] = ''
      setDigits(newDigits)
      inputRefs.current[index - 1]?.focus()
    }
  }, [digits])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH)
    if (!pasted) return
    const newDigits = Array(PIN_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i]
    setDigits(newDigits)
    const focusIdx = Math.min(pasted.length, PIN_LENGTH - 1)
    inputRefs.current[focusIdx]?.focus()
    checkPin(newDigits)
  }, [checkPin])

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
        padding: '40px 36px', width: '100%', maxWidth: 360,
        textAlign: 'center', animation: 'modal-in 0.3s ease-out',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--accent-soft)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>
          Adminpanel
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: '0 0 28px' }}>
          Ange PIN-kod för att fortsätta
        </p>

        <div style={{
          display: 'flex', gap: 12, justifyContent: 'center',
          animation: shake ? 'shake 0.4s ease-in-out' : 'none',
        }}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              style={{
                width: 56, height: 64,
                border: `2px solid ${error ? 'var(--danger)' : digit ? 'var(--accent)' : 'var(--border-strong)'}`,
                borderRadius: 'var(--radius-xs)', background: 'var(--bg)',
                fontSize: '1.5rem', fontWeight: 700, textAlign: 'center',
                color: 'var(--text)',
                transition: 'border-color 0.2s',
                outline: 'none',
                caretColor: 'var(--accent)',
              }}
              onFocus={e => e.target.select()}
            />
          ))}
        </div>

        {error && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', margin: '14px 0 0', fontWeight: 500 }}>
            Fel PIN-kod, försök igen
          </p>
        )}

        <a href="#" onClick={e => { e.preventDefault(); window.location.hash = '' }} style={{
          display: 'inline-block', marginTop: 24, fontSize: '0.8125rem',
          color: 'var(--text-tertiary)', textDecoration: 'none',
        }}>
          Tillbaka till bokning
        </a>
      </div>
    </div>
  )
}

function App() {
  const [route, setRoute] = useState<'booking' | 'admin'>(() =>
    window.location.hash === '#admin' ? 'admin' : 'booking'
  )
  const [unlocked, setUnlocked] = useState(() =>
    sessionStorage.getItem('admin_unlocked') === '1'
  )

  useEffect(() => {
    const onHash = () => {
      setRoute(window.location.hash === '#admin' ? 'admin' : 'booking')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route === 'admin') {
    if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />
    return <AdminPanel />
  }

  return <BookingCalendar />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
