import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { IS_DESKTOP } from '../lib/platform'
import { supabase } from '../lib/supabase'
import { auth, useAuth } from '../storage/authStore'

const input =
  'rounded-[10px] border border-border bg-bg px-3 py-3 text-[15px] text-text outline-none focus-visible:ring-2 focus-visible:ring-accent'

/** The Google "G" mark, as used on Sign in with Google buttons. */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/** Log in with Google (also creates the account the first time), or with an existing email account. */
export function Login() {
  const { user, isAnonymous, ready } = useAuth()
  const [reset, setReset] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (ready && user && !isAnonymous) return <Navigate to="/play" replace />

  const google = async () => {
    setError(null)
    const err = await auth.google()
    if (err) setError(err)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    if (reset) {
      const err = await auth.resetPassword(email)
      if (err) setError(err)
      else setNotice('If that email has an account, a reset link is on its way.')
    } else {
      setError(await auth.signIn(email, password))
    }
    setBusy(false)
  }

  return (
    <main className="flex justify-center px-4 pb-14 pt-6">
      <div className="flex w-full max-w-[420px] flex-col gap-[18px] rounded-[20px] border border-border bg-surface p-8 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        {!supabase && (
          <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm">
            Accounts are not set up on this copy of TypeRight. Everything else works as a guest.
          </p>
        )}
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">{reset ? 'Reset your password' : 'Log in'}</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            {reset
              ? 'We will email you a link to set a new password.'
              : IS_DESKTOP
                ? 'Log in with your email and password. Signed up with Google? Set a password in your profile on the TypeRight website first.'
                : isAnonymous
                ? 'Link Google to keep your guest results.'
                : 'Save your progress and get on the leaderboard. New here? Google creates your account.'}
          </p>
        </div>

        {/* Google sign-in needs a browser redirect, which the desktop app can't receive. */}
        {!reset && !IS_DESKTOP && (
          <>
            <button
              type="button"
              onClick={google}
              className="flex items-center justify-center gap-3 rounded-xl border border-border bg-white py-3 text-[15px] font-semibold text-[#1f1f1f] hover:bg-[#f7f8f8]"
            >
              <GoogleLogo />
              Continue with Google
            </button>
            <p className="-mt-2 text-center text-[13px] leading-snug text-muted">
              We only get your name and email. We never see your Google password, and we never post anything.
              <br />
              <span lang="fil">Pangalan at email lang ang natatanggap namin. Hindi namin nakikita ang password mo.</span>
            </p>
            <div className="flex items-center gap-3 text-[13px] text-muted">
              <div className="h-px flex-1 bg-border" />or with email<div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Email
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </label>
          {!reset && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Password
              <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
          )}
          {error && <p role="alert" className="text-sm font-semibold text-bad">{error}</p>}
          {notice && <p role="status" className="text-sm font-semibold text-good">{notice}</p>}
          <button type="submit" disabled={busy} className="rounded-xl bg-accent py-3.5 text-base font-bold text-accent-contrast hover:opacity-90 disabled:opacity-60">
            {busy ? 'Please wait…' : reset ? 'Send reset link' : 'Log in'}
          </button>
          <button
            type="button"
            onClick={() => {
              setReset(!reset)
              setError(null)
              setNotice(null)
            }}
            className="self-center text-sm font-semibold text-accent"
          >
            {reset ? 'Back to log in' : 'Forgot password?'}
          </button>
        </form>

        <div className="flex flex-col gap-2 border-t border-border pt-4 text-center">
          <Link to="/play" className="text-[15px] font-semibold text-accent">Continue as guest</Link>
          <span className="text-[13px] text-muted">Everything works without an account. Guest progress is lost when you close the site.</span>
        </div>
      </div>
    </main>
  )
}
