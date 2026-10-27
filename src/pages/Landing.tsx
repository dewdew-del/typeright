import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'
import { ThemeButton } from '../components/layout/ThemeButton'
import { WALLPAPERS, pickWallpaper } from '../components/wallpaper/Wallpapers'
import { useActiveCount } from '../lib/presence'
import { useResolvedTheme } from '../lib/theme'

export function Landing() {
  // A different wallpaper on each visit; it follows the light or dark theme.
  const [index] = useState(pickWallpaper)
  const night = useResolvedTheme() === 'dark'
  const active = useActiveCount((s) => s.count)
  const { Scene, ink } = WALLPAPERS[index]
  const colors = night ? ink.dark : ink.light
  const vars = { '--on-sky': colors.onSky, '--cta-bg': colors.cta, '--cta-fg': colors.ctaFg } as CSSProperties

  return (
    <div className="relative min-h-full overflow-hidden text-on-sky" style={vars}>
      <Scene night={night} />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo to="/" variant="sky" size="lg" />
        <div className="flex items-center gap-4 text-base font-medium sm:gap-6">
          <button type="button" className="flex items-center gap-1.5 py-1.5" aria-label="Language: English">
            English
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <ThemeButton variant="sky" />
          <Link to="/login" className="rounded-full bg-cta px-5 py-[9px] font-semibold text-cta-fg hover:opacity-90">
            Login
          </Link>
        </div>
      </header>

      <div className="relative z-[1] flex min-h-[520px] items-center px-5 pb-24 sm:px-8">
        <div className="flex max-w-[620px] flex-col items-start gap-7 py-2">
          <h1 className="m-0 text-4xl font-medium leading-[1.1] tracking-tight sm:text-[56px]">
            Learn to type.
            <br />
            Race to the top.
            <span aria-hidden className="caret ml-1.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] bg-current" />
          </h1>
          <Link
            to="/play"
            className="inline-block rounded-md bg-cta px-[54px] py-[18px] text-xl font-semibold tracking-wide text-cta-fg shadow-[0_8px_24px_rgba(5,20,50,0.25)] hover:opacity-95"
          >
            Get Started
          </Link>
          <span className="text-[15px] opacity-85">Free. No account needed.</span>
        </div>
      </div>

      {active !== null && active > 0 && (
        <p aria-live="polite" className="absolute bottom-0 left-0 z-10 flex items-center gap-2 px-5 py-4 text-sm sm:px-8" style={{ color: colors.foot }}>
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#34d399] shadow-[0_0_0_3px_rgba(52,211,153,0.3)]" />
          {active} {active === 1 ? 'person' : 'people'} online
        </p>
      )}

      <footer className="absolute inset-x-0 bottom-0 z-10 px-5 py-4 text-right text-sm sm:px-8" style={{ color: colors.foot }}>
        <Link to="/privacy" className="underline underline-offset-2 opacity-90 hover:opacity-100">Privacy policy</Link>
      </footer>
    </div>
  )
}
