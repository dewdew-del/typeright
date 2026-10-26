import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { auth, useAuth } from '../../storage/authStore'

/** Online play needs a player id: an account, or a guest session created on the spot. */
export function NeedsPlayer({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!ready) return null
  if (user) return <>{children}</>

  const guest = async () => {
    setBusy(true)
    setError(await auth.ensureGuest())
    setBusy(false)
  }

  return (
    <section className="mx-auto flex max-w-[480px] flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-8 text-center">
      <h2 className="text-2xl font-bold tracking-tight">Pick a name to race</h2>
      <p className="text-muted">Play as a guest right away, or log in to keep your race history.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={guest} disabled={busy} className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast hover:opacity-90 disabled:opacity-60">
          {busy ? 'Starting…' : 'Play as guest'}
        </button>
        <Link to="/login" className="rounded-xl border border-border bg-bg px-6 py-3 font-bold hover:bg-surface-2">Log in</Link>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-bad">{error}</p>}
      <p className="text-xs text-muted">A guest session lasts until you close the site.</p>
    </section>
  )
}

/** "Playing as Guest-4821 · Change name" */
export function PlayingAs() {
  const profile = useAuth((s) => s.profile)
  if (!profile) return null
  return (
    <div className="text-center text-sm text-muted">
      Playing as <b className="text-text">{profile.username}</b> ·{' '}
      <Link to="/profile" className="font-bold text-accent">Change name</Link>
    </div>
  )
}
