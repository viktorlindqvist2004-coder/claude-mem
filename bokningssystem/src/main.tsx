import { StrictMode, useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import BookingCalendar from './BookingCalendar'
import AdminPanel from './AdminPanel'
import './index.css'

const ADMIN_PIN = '2004'

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const submit = useCallback(() => {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem('admin_unlocked', '1')
      onUnlock()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setPin('')
    }
  }, [pin, onUnlock])

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
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: '0 0 24px' }}>
          Ange PIN-kod för att fortsätta
        </p>

        <div style={{ animation: shake ? 'shake 0.4s ease-in-out' : 'none' }}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(false) }}
            onKeyDown={e => { if (e.key === 'Enter' && pin.length === 4) submit() }}
            placeholder="••••"
            autoFocus
            style={{
              width: '100%', padding: '14px 16px',
              border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
              borderRadius: 'var(--radius-xs)', background: 'var(--bg)',
              fontSize: '1.5rem', fontWeight: 700, textAlign: 'center',
              letterSpacing: '0.3em', color: 'var(--text)',
              transition: 'border-color 0.2s',
              outline: 'none',
            }}
          />
        </div>

        {error && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', margin: '10px 0 0', fontWeight: 500 }}>
            Fel PIN-kod, försök igen
          </p>
        )}

        <button
          onClick={submit}
          disabled={pin.length !== 4}
          style={{
            width: '100%', marginTop: 16, padding: '13px',
            border: 'none', borderRadius: 'var(--radius-xs)',
            background: pin.length === 4 ? 'var(--accent)' : 'var(--bg-muted)',
            color: pin.length === 4 ? '#fff' : 'var(--text-tertiary)',
            fontSize: '0.9375rem', fontWeight: 600, cursor: pin.length === 4 ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          Lås upp
        </button>

        <a href="#" style={{
          display: 'inline-block', marginTop: 20, fontSize: '0.8125rem',
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
