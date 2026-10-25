import { useEffect, useState } from 'react'
import { useSettings, type ThemeMode } from '../stores/settings'

export type Theme = 'light' | 'dark'

export const DAY_START_HOUR = 6
export const NIGHT_START_HOUR = 18

/** Pure so it can be unit tested: which theme for this mode and local hour (0-23)? */
export function resolveTheme(mode: ThemeMode, hour: number): Theme {
  if (mode !== 'auto') return mode
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? 'light' : 'dark'
}

export function useResolvedTheme(): Theme {
  const mode = useSettings((s) => s.theme)
  const [hour, setHour] = useState(() => new Date().getHours())

  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  return resolveTheme(mode, hour)
}

/** Mount once at the root: keeps <html data-theme> in sync with the resolved theme. */
export function useApplyTheme() {
  const theme = useResolvedTheme()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
}

/** Returns the current theme and a function that switches to the opposite one explicitly. */
export function useThemeToggle() {
  const theme = useResolvedTheme()
  const set = useSettings((s) => s.set)
  return { theme, toggle: () => set({ theme: theme === 'dark' ? 'light' : 'dark' }) }
}
