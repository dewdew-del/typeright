import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../storage/authStore'
import { Avatar } from './Avatar'
import { Logo } from './Logo'
import { MergePrompt } from './MergePrompt'
import { ThemeButton } from './ThemeButton'

/** Header (logo, settings, theme button, Login) above every page inside the app. */
export function AppShell() {
  return (
    <div className="min-h-full bg-bg text-text">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Logo to="/play" />
        <div className="flex items-center gap-2.5">
          <Link
            to="/settings"
            aria-label="Settings"
            className="grid h-[38px] w-[38px] place-items-center rounded-full border border-border bg-surface text-text hover:bg-surface-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </Link>
          <ThemeButton />
          <AccountButton />
        </div>
      </header>
      <Outlet />
      <MergePrompt />
    </div>
  )
}

/** Login for guests; the avatar and username (linking to the profile) once signed in. */
export function AccountButton() {
  const { user, profile, isAnonymous } = useAuth()
  if (user && profile && !isAnonymous) {
    return (
      <Link to="/profile" className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3.5 text-sm font-bold hover:bg-surface-2">
        <Avatar name={profile.username} url={profile.avatar_url} size={30} />
        <span className="max-w-[120px] truncate">{profile.username}</span>
      </Link>
    )
  }
  return (
    <Link to="/login" className="rounded-full bg-accent px-[18px] py-[9px] text-sm font-bold text-accent-contrast hover:opacity-90">
      Login
    </Link>
  )
}
