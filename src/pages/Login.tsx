import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { auth, USERNAME_RE, useAuth } from '../storage/authStore'

type Mode = 'login' | 'signup' | 'reset'

const input =
  'rounded-[10px] border border-border bg-bg px-3 py-3 text-[15px] text-text outline-none focus-visible:ring-2 focus-visible:ring-accent'

export function Login() {
  const { user, isAnonymous, ready } = useAuth()
  const [mode, setMode] = useState<Mode>(isAnonymous ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [nameFree, setNameFree] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Live username check on the sign-up form.
  useEffect(() => {
    if (mode !== 'signup' || !USERNAME_RE.test(username)) {
      setNameFree(null)
      return
    }
    const id = window.setTimeout(() => void auth.usernameAvailable(username).then(setNameFree), 350)
    return () => window.clearTimeout(id)
  }, [username, mode])

  if (ready && user && !isAnonymous) return <Navigate to="/profile" replace />

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    if (mode === 'login') {
      setError(await auth.signIn(email, password))
    } else if (mode === 'reset') {
      const err = await auth.resetPassword(email)
      if (err) setError(err)
      else setNotice('If that email has an account, a reset link is on its way.')
    } else {
      const { error: err, needsConfirm } = await auth.signUp(email, password, username)
      if (err) setError(err)
      else if (needsConfirm) setNotice('Check your email and click the link to confirm your account.')
    }
    setBusy(false)
  }

  const google = async () => {
    setError(null)
    const err = await auth.google()
    if (err) setError(err)
  }

  const heading = mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'
  const sub =
    mode === 'signup'
      ? isAnonymous
        ? 'Keep your guest results by linking an email or Google.'
        : 'Save your progress and join the leaderboard.'
      : mode === 'reset'
        ? 'We will email you a link to set a new password.'
        : 'Log in to pick up where you left off.'

  const tab = (on: boolean) =>
    ['flex-1 rounded-[9px] py-2 text-sm font-semibold', on ? 'bg-surface text-text shadow-[0_1px_3px_rgba(15,23,42,0.12)]' : 'text-muted'].join(' ')

  return (
    <main className="flex justify-center px-4 pb-14 pt-6">
      <div className="flex w-full max-w-[420px] flex-col gap-[18px] rounded-[20px] border border-border bg-surface p-8 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        {!supabase && (
          <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm">
            Accounts are not set up on this copy of TypeRight. Everything else works as a guest.
          </p>
        )}
        {mode !== 'reset' && (
          <div className="flex gap-1 rounded-xl bg-bg p-1" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={tab(mode === 'login')} onClick={() => switchMode('login')}>Log in</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={tab(mode === 'signup')} onClick={() => switchMode('signup')}>Sign up</button>
          </div>
        )}
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">{heading}</h1>
          <p className="mt-1.5 text-[15px] text-muted">{sub}</p>
        </div>

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              onClick={google}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-border bg-surface py-3 text-[15px] font-semibold hover:bg-surface-2"
            >
              <span aria-hidden className="h-5 w-5 rounded-full" style={{ background: 'conic-gradient(#ea4335 0 25%, #fbbc05 0 50%, #34a853 0 75%, #4285f4 0)' }} />
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-[13px] text-muted">
              <div className="h-px flex-1 bg-border" />or with email<div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          {mode === 'signup' && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Username
              <input
                className={input}
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                placeholder="e.g. dewdew"
                autoComplete="username"
                required
                pattern="[A-Za-z0-9_\-]{3,20}"
                aria-describedby="username-help"
              />
              <span id="username-help" className={['text-xs font-medium', nameFree === false ? 'text-bad' : nameFree ? 'text-good' : 'text-muted'].join(' ')}>
                {nameFree === false ? 'That username is taken.' : nameFree ? 'Available.' : '3 to 20 letters, numbers, _ or -'}
              </span>
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Email
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </label>
          {mode !== 'reset' && !(mode === 'signup' && isAnonymous) && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Password
              <input
                className={input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
            </label>
          )}
          {error && <p role="alert" className="text-sm font-semibold text-bad">{error}</p>}
          {notice && <p role="status" className="text-sm font-semibold text-good">{notice}</p>}
          <button
            type="submit"
            disabled={busy || (mode === 'signup' && nameFree === false)}
            className="rounded-xl bg-accent py-3.5 text-base font-bold text-accent-contrast hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'signup' ? (isAnonymous ? 'Link my email' : 'Create account') : mode === 'reset' ? 'Send reset link' : 'Log in'}
          </button>
          {mode === 'login' && (
            <button type="button" onClick={() => switchMode('reset')} className="self-center text-sm font-semibold text-accent">Forgot password?</button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => switchMode('login')} className="self-center text-sm font-semibold text-accent">Back to log in</button>
          )}
        </form>

        <div className="flex flex-col gap-2 border-t border-border pt-4 text-center">
          <Link to="/play" className="text-[15px] font-semibold text-accent">Continue as guest</Link>
          <span className="text-[13px] text-muted">Everything works without an account. Guest progress is lost when you close the site.</span>
        </div>
      </div>
    </main>
  )
}
