import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { COUNTRIES } from '../../content/countries'
import { auth, USERNAME_RE, useAuth } from '../../storage/authStore'
import { useUi } from '../../stores/settings'
import { Avatar } from './Avatar'
import { Overlay } from './Overlay'

const input =
  'rounded-[10px] border border-border bg-bg px-3 py-3 text-[15px] text-text outline-none focus-visible:ring-2 focus-visible:ring-accent'

/** Your profile as a side panel. Click the photo to change it. */
export function ProfilePanel() {
  const { panel, close, open } = useUi()
  const { user, profile, isAnonymous } = useAuth()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('PH')
  const [password, setPassword] = useState('')
  const [busyPhoto, setBusyPhoto] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!profile) return
    setUsername(profile.username)
    setCountry(profile.country)
  }, [profile, panel])

  if (panel !== 'profile' || !user) return null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!USERNAME_RE.test(username)) return setMsg({ ok: false, text: 'Username: 3 to 20 letters, numbers, dots, _ or -' })
    const err = await auth.updateProfile({ username, country })
    open('profile') // saving never closes the panel, whatever happened while it waited for the server
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Saved.' })
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    const err = await auth.setPassword(password)
    open('profile')
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Password saved.' })
    if (!err) setPassword('')
  }

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    setBusyPhoto(true)
    const err = await auth.uploadAvatar(file)
    setBusyPhoto(false)
    open('profile')
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Photo updated.' })
  }

  return (
    <Overlay title="Your profile" side onClose={close}>
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="group relative rounded-full focus-visible:outline-2"
          aria-label="Change profile photo"
          disabled={busyPhoto}
        >
          <Avatar name={profile?.username ?? '?'} url={profile?.avatar_url} size={104} />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-sm font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {busyPhoto ? 'Uploading…' : 'Change photo'}
          </span>
        </button>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void onPhoto(e.target.files?.[0])} />
        <div className="text-lg font-bold">{profile?.username}</div>
        <div className="text-sm text-muted">{isAnonymous ? 'Guest (this tab only)' : user.email}</div>
        {profile && (
          <Link to={`/u/${encodeURIComponent(profile.username)}`} onClick={close} className="text-sm font-bold text-accent">
            View public profile
          </Link>
        )}
      </div>

      {msg && <p role={msg.ok ? 'status' : 'alert'} className={['text-center text-sm font-semibold', msg.ok ? 'text-good' : 'text-bad'].join(' ')}>{msg.text}</p>}

      <form onSubmit={save} className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Username
          <input className={input} value={username} onChange={(e) => setUsername(e.target.value.trim())} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Country
          <select className={input} value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-xl bg-accent py-3 font-bold text-accent-contrast hover:opacity-90">Save</button>
      </form>

      {!isAnonymous && (
        <form onSubmit={savePassword} className="flex flex-col gap-3 border-t border-border pt-5">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Set or change password
            <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="At least 8 characters" />
          </label>
          <button type="submit" className="rounded-xl border border-border bg-bg py-3 font-bold hover:bg-surface-2">Save password</button>
        </form>
      )}

      <button
        type="button"
        onClick={async () => {
          await auth.signOut()
          close()
          navigate('/play')
        }}
        className="mt-auto rounded-xl border border-border bg-bg py-3 font-bold text-bad hover:bg-surface-2"
      >
        Log out
      </button>
    </Overlay>
  )
}
