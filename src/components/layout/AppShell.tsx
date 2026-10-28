import { lazy, Suspense, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../storage/authStore'
import { useUi } from '../../stores/settings'
import { Avatar } from './Avatar'
import { Logo } from './Logo'
import { MergePrompt } from './MergePrompt'
import { ThemeButton } from './ThemeButton'

// The three pop-ups load in their own files: not needed until someone opens one.
const loadSettings = () => import('./SettingsDialog')
const loadLeaderboard = () => import('../../pages/Leaderboard')
const loadProfile = () => import('./ProfilePanel')
const SettingsDialog = lazy(() => loadSettings().then((m) => ({ default: m.SettingsDialog })))
const LeaderboardDialog = lazy(() => loadLeaderboard().then((m) => ({ default: m.LeaderboardDialog })))
const ProfilePanel = lazy(() => loadProfile().then((m) => ({ default: m.ProfilePanel })))

/** Downloads the pop-ups quietly once the page is idle, so the first click opens instantly. */
function usePrefetchPanels() {
  useEffect(() => {
    const run = () => void Promise.all([loadSettings(), loadLeaderboard(), loadProfile()]).catch(() => {})
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(run, 2000)
    return () => window.clearTimeout(id)
  }, [])
}

const TITLES: [RegExp, string][] = [
  [/^\/play/, 'Choose a mode'],
  [/^\/journey\/test/, 'Level test'],
  [/^\/journey\/./, 'Lesson'],
  [/^\/journey/, 'Journey'],
  [/^\/friends/, 'Play with friends'],
  [/^\/race\//, 'Race'],
  [/^\/casual/, 'Casual typing'],
  [/^\/practice/, 'Weak-keys practice'],
  [/^\/login/, 'Log in'],
  [/^\/privacy/, 'Privacy policy'],
  [/^\/admin/, 'Developer view'],
  [/^\/u\//, 'Profile'],
]

/** Where the back button goes from each page: one step up the menu. No button on the mode menu itself. */
const BACK: [RegExp, string, string][] = [
  [/^\/journey\/./, '/journey', 'Back to Journey'],
  [/^\/journey\/?$/, '/play', 'Back to the menu'],
  [/^\/friends\/./, '/friends', 'Back to Play with friends'],
  [/^\/race\//, '/friends', 'Back to Play with friends'],
  [/^\/friends\/?$/, '/play', 'Back to the menu'],
  [/^\/casual\/./, '/play', 'Back to the menu'],
  [/^\/casual\/?$/, '/play', 'Back to the menu'],
  [/^\/(practice|login|privacy|admin|u\/)/, '/play', 'Back to the menu'],
]

/** Each page gets its own tab title, which screen readers announce on navigation. */
function usePageTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const name = TITLES.find(([re]) => re.test(pathname))?.[1]
    document.title = name ? `${name} · TypeRight` : 'TypeRight'
  }, [pathname])
}

/** Header (logo, settings, theme button, Login) above every page inside the app. */
export function AppShell() {
  const open = useUi((s) => s.open)
  usePageTitle()
  return (
    <div className="min-h-full bg-bg text-text">
      <a
        href="#content"
        className="sr-only z-50 rounded-xl bg-accent px-4 py-2 font-bold text-accent-contrast focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="flex items-center justify-between gap-3 px-4 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <BackButton />
          <Logo to="/" />
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => open('leaderboard')}
            aria-label="Leaderboard"
            className="grid h-[38px] w-[38px] place-items-center rounded-full border border-border bg-surface text-text hover:bg-surface-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
              <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => open('settings')}
            aria-label="Settings"
            className="grid h-[38px] w-[38px] place-items-center rounded-full border border-border bg-surface text-text hover:bg-surface-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
          <ThemeButton />
          <AccountButton />
        </div>
      </header>
      <div id="content" tabIndex={-1} className="outline-none">
        <Outlet />
      </div>
      <MergePrompt />
      <Panels />
    </div>
  )
}

/** Each pop-up is created the first time it is opened and then stays, as before. */
function Panels() {
  const panel = useUi((s) => s.panel)
  const seen = useRef({ settings: false, leaderboard: false, profile: false })
  if (panel) seen.current[panel] = true
  usePrefetchPanels()
  return (
    <Suspense fallback={null}>
      {seen.current.settings && <SettingsDialog />}
      {seen.current.leaderboard && <LeaderboardDialog />}
      {seen.current.profile && <ProfilePanel />}
    </Suspense>
  )
}

/** Arrow to the page one step up, shown on every page below the mode menu. */
function BackButton() {
  const { pathname } = useLocation()
  const back = BACK.find(([re]) => re.test(pathname))
  if (!back) return null
  return (
    <Link
      to={back[1]}
      aria-label={back[2]}
      title={back[2]}
      className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border border-border bg-surface text-text hover:bg-surface-2"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </Link>
  )
}

/** Login for guests; the avatar and username (opens the profile panel) once signed in. */
export function AccountButton() {
  const { user, profile, isAnonymous } = useAuth()
  const open = useUi((s) => s.open)
  if (user && profile && !isAnonymous) {
    return (
      <button type="button" onClick={() => open('profile')} aria-label="Your profile" className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3.5 text-sm font-bold hover:bg-surface-2">
        <Avatar name={profile.username} url={profile.avatar_url} size={30} />
        <span className="max-w-[120px] truncate">{profile.username}</span>
      </button>
    )
  }
  return (
    <Link to="/login" className="rounded-full bg-accent px-[18px] py-[9px] text-sm font-bold text-accent-contrast hover:opacity-90">
      Login
    </Link>
  )
}
