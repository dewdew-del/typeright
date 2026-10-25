import { Link, Outlet } from 'react-router-dom'
import { Logo } from './Logo'
import { ThemeButton } from './ThemeButton'

/** Header (logo, theme button, Login) above every page inside the app. */
export function AppShell() {
  return (
    <div className="min-h-full bg-bg text-text">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Logo to="/play" />
        <div className="flex items-center gap-2.5">
          <ThemeButton />
          <Link
            to="/login"
            className="rounded-full bg-accent px-[18px] py-[9px] text-sm font-bold text-accent-contrast hover:opacity-90"
          >
            Login
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
