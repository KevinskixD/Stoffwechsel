import { useEffect, useRef, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { isFirebaseConfigured } from './firebase/config'
import { ensureSeedData } from './firebase/seed'
import { AppRoutes } from './routes/router'
import { Sidebar } from './shared/components/Sidebar'

function App() {
  const [seeded, setSeeded] = useState(false)
  const hasSeeded = useRef(false)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    if (hasSeeded.current) return
    hasSeeded.current = true
    ensureSeedData().finally(() => setSeeded(true))
  }, [])

  if (!isFirebaseConfigured) {
    return (
      <div className="mx-auto max-w-lg p-10 text-sm text-gray-700">
        <h1 className="mb-2 text-lg font-extrabold text-gray-900">Firebase ist noch nicht konfiguriert</h1>
        <p className="mb-3">
          Die Datei <code className="rounded bg-black/[0.06] px-1.5 py-0.5">.env.local</code> enthält noch keine
          Firebase-Projekt-Werte. Trage dort <code>VITE_FIREBASE_API_KEY</code>,{' '}
          <code>VITE_FIREBASE_AUTH_DOMAIN</code>, <code>VITE_FIREBASE_PROJECT_ID</code>,{' '}
          <code>VITE_FIREBASE_STORAGE_BUCKET</code>, <code>VITE_FIREBASE_MESSAGING_SENDER_ID</code> und{' '}
          <code>VITE_FIREBASE_APP_ID</code> ein (siehe README) und starte <code>npm run dev</code> neu.
        </p>
      </div>
    )
  }

  if (!seeded) {
    return <div className="p-6 text-gray-400">Lädt…</div>
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-page text-gray-900">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="h-1 shrink-0 bg-brand" />
          <main className="flex-1">
            <AppRoutes />
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
