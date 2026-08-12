import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// One route, so no router: /admin is the barber's view, everything else is
// the site. vercel.json rewrites all paths to index.html, so the deep link
// works on a reload. The panel is split out of the main bundle — visitors
// never download it.
const AdminPanel = lazy(() => import('./booking/AdminPanel.tsx'))

const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? (
      <div className="min-h-screen rich-bg grain-overlay">
        <div className="floor" aria-hidden><div className="floor-base" /></div>
        <div className="relative z-10">
          <Suspense fallback={null}>
            <AdminPanel />
          </Suspense>
        </div>
      </div>
    ) : (
      <App />
    )}
  </StrictMode>,
)
