import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { auth, USERNAME_RE, useAuth } from '../../storage/authStore'
import { Overlay } from '../layout/Overlay'

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

/** "Playing as Guest-4821 · Change name": the name is changed in a small pop-up, not on the profile. */
export function PlayingAs() {
  const profile = useAuth((s) => s.profile)
  const [editing, setEditing] = useState(false)
  if (!profile) return null
  return (
    <div className="text-center text-sm text-muted">
      Playing as <b className="text-text">{profile.username}</b> ·{' '}
      <button type="button" onClick={() => setEditing(true)} className="font-bold text-accent hover:underline">Change name</button>
      {editing && <NameDialog current={profile.username} onClose={() => setEditing(false)} />}
    </div>
  )
}

function NameDialog({ current, onClose }: { current: string; onClose: () => void }) {
  const [name, setName] = useState(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!USERNAME_RE.test(name)) return setError('3 to 20 letters, numbers, dots, _ or -')
    if (name === current) return onClose()
    setBusy(true)
    const err = await auth.updateProfile({ username: name })
    setBusy(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <Overlay title="Change name" onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4 text-left">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
          Your name
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value.trim())
              setError(null)
            }}
            maxLength={20}
            autoComplete="off"
            className="rounded-[10px] border border-border bg-bg px-3 py-3 text-[15px] text-text outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
        {error && <p role="alert" className="text-sm font-semibold text-bad">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-accent py-3 font-bold text-accent-contrast hover:opacity-90 disabled:opacity-60">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-border bg-bg px-6 py-3 font-bold text-text hover:bg-surface-2">Cancel</button>
        </div>
      </form>
    </Overlay>
  )
}
