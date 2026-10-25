import { Link } from 'react-router-dom'

interface Props {
  to: string
  /** 'sky' uses the sky text color and a white tile. */
  variant?: 'surface' | 'sky'
  size?: 'md' | 'lg'
}

export function Logo({ to, variant = 'surface', size = 'md' }: Props) {
  const sky = variant === 'sky'
  return (
    <Link
      to={to}
      className={[
        'flex items-center gap-2.5 font-extrabold tracking-tight',
        size === 'lg' ? 'text-2xl' : 'text-xl',
        sky ? 'text-on-sky' : 'text-text',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={[
          'grid h-[34px] w-[34px] place-items-center rounded-[10px] text-base font-extrabold',
          sky ? 'bg-cta text-cta-fg' : 'bg-accent text-accent-contrast',
        ].join(' ')}
      >
        T
      </span>
      TypeRight
    </Link>
  )
}
