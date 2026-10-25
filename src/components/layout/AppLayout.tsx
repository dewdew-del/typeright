import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSettings } from '../../stores/settings'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/lessons', label: 'Lessons' },
  { to: '/keyboard', label: 'Keyboard' },
  { to: '/progress', label: 'Progress' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/race', label: 'Race' },
  { to: '/groups', label: 'Groups' },
  { to: '/settings', label: 'Settings' },
]

export function AppLayout() {
  const theme = useSettings((s) => s.theme)
  const set = useSettings((s) => s.set)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="border-b border-border bg-surface md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:px-5 md:py-5">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-contrast"
            >
              T
            </span>
            TypeRight
          </NavLink>
          <button
            type="button"
            onClick={() => set({ theme: theme === 'dark' ? 'light' : 'dark' })}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-text md:mt-4 md:w-full"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-accent text-accent-contrast' : 'text-muted hover:bg-surface-2 hover:text-text',
                ].join(' ')
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  )
}
