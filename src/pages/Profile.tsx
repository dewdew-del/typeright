import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/layout/Avatar'
import { COUNTRIES } from '../content/countries'
import { auth, USERNAME_RE, useAuth } from '../storage/authStore'

const input =
  'rounded-[10px] border border-border bg-bg px-3 py-3 text-[15px] text-text outline-none focus-visible:ring-2 focus-visible:ring-accent'

export function Profile() {
  const { ready, user, profile, isAnonymous } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('PH')
  const [avatar, setAvatar] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!profile) return
    setUsername(profile.username)
    setCountry(profile.country)
    setAvatar(profile.avatar_url ?? '')
  }, [profile])

  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!USERNAME_RE.test(username)) return setMsg({ ok: false, text: 'Username: 3 to 20 letters, numbers, _ or -' })
    if (avatar && !/^https:\/\/\S+$/.test(avatar)) return setMsg({ ok: false, text: 'Avatar must be an https:// image link.' })
    const err = await auth.updateProfile({ username, country, avatar_url: avatar || null })
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Saved.' })
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    const err = await auth.setPassword(password)
    setPwMsg(err ? { ok: false, text: err } : { ok: true, text: 'Password saved.' })
    if (!err) setPassword('')
  }

  return (
    <main className="mx-auto flex max-w-[680px] flex-col gap-6 px-6 pb-16 pt-2">
      <div className="flex items-center gap-4">
        <Avatar name={profile?.username ?? '?'} url={profile?.avatar_url} size={56} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile?.username ?? 'Your profile'}</h1>
          <p className="text-sm text-muted">{isAnonymous ? 'Guest account (this tab only)' : user.email}</p>
        </div>
      </div>

      {isAnonymous && (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-accent-soft p-4 text-sm">
          <span className="flex-1">You are playing as a guest. Link an email or Google to keep your results after you close the site.</span>
          <Link to="/login" className="rounded-xl bg-accent px-4 py-2 font-bold text-accent-contrast">Keep my results</Link>
        </section>
      )}

      <form onSubmit={save} className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Username
          <input className={input} value={username} onChange={(e) => setUsername(e.target.value.trim())} required pattern="[A-Za-z0-9_\-]{3,20}" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Country
          <select className={input} value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Avatar image link (optional)
          <input className={input} value={avatar} onChange={(e) => setAvatar(e.target.value.trim())} placeholder="https://…" inputMode="url" />
        </label>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={['text-sm font-semibold', msg.ok ? 'text-good' : 'text-bad'].join(' ')}>{msg.text}</p>}
        <button type="submit" className="self-start rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast hover:opacity-90">Save profile</button>
      </form>

      {!isAnonymous && (
        <form onSubmit={savePassword} className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {params.get('set-password') ? 'Set your password' : 'Change password'}
            <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="At least 8 characters" />
          </label>
          {pwMsg && <p role={pwMsg.ok ? 'status' : 'alert'} className={['text-sm font-semibold', pwMsg.ok ? 'text-good' : 'text-bad'].join(' ')}>{pwMsg.text}</p>}
          <button type="submit" className="self-start rounded-xl border border-border bg-bg px-6 py-3 font-bold hover:bg-surface-2">Save password</button>
        </form>
      )}

      <button
        type="button"
        onClick={async () => {
          await auth.signOut()
          navigate('/play')
        }}
        className="self-start rounded-xl border border-border bg-surface px-6 py-3 font-bold text-bad hover:bg-surface-2"
      >
        Log out
      </button>
    </main>
  )
}
