import { useThemeToggle } from '../../lib/theme'

interface Props {
  /** 'sky' draws the button for use on top of the landing sky. */
  variant?: 'surface' | 'sky'
}

export function ThemeButton({ variant = 'surface' }: Props) {
  const { theme, toggle } = useThemeToggle()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        'grid h-[38px] w-[38px] place-items-center rounded-full border',
        variant === 'sky'
          ? 'border-current bg-transparent text-on-sky opacity-90 hover:opacity-100'
          : 'border-border bg-surface text-text hover:bg-surface-2',
      ].join(' ')}
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )
}
