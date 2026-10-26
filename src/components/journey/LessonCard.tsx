import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LessonDef } from '../../content/lessons/types'
import type { LessonStatus } from '../../engine/progress'

const STAR = 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z'

function tiles(keys: string): string[] {
  if (keys === 'Shift') return ['Shift']
  if (keys === ' ') return ['␣']
  return [...keys.replace(/ /g, '')].slice(0, 3).map((c) => c.toUpperCase())
}

function TypeIcon({ type }: { type: LessonDef['type'] }) {
  const common = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--accent)', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (type) {
    case 'review':
      return <svg {...common}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></svg>
    case 'accuracy':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" /></svg>
    case 'speed':
      return <svg {...common}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2.5h5" /></svg>
    case 'game':
      return <svg {...common}><rect x="3" y="8" width="18" height="10" rx="5" /><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01" /></svg>
    case 'checkpoint':
      return <svg {...common}><path d="M5 21V4M5 4h12l-2.5 4 2.5 4H5" /></svg>
    case 'intro':
      return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></svg>
    default:
      return <svg {...common}><path d="M4 7h16M4 12h10M4 17h13" /></svg>
  }
}

interface Props {
  lesson: LessonDef
  status: LessonStatus
  stars: number
  target?: string
}

/** One lesson in the Journey grid: a small illustrated panel, number, status and title. */
export function LessonCard({ lesson, status, stars, target }: Props) {
  const isKeys = lesson.type === 'new-keys' && lesson.keys !== ''
  const current = status === 'current'
  const locked = status === 'locked'
  const muted = locked || status === 'skipped'

  return (
    <Wrapper
      locked={locked}
      id={`lesson-${lesson.order}`}
      to={`/journey/${lesson.id}`}
      className={[
        'flex scroll-mt-32 flex-col overflow-hidden rounded-[18px] text-text transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        lesson.type === 'checkpoint' ? 'bg-accent-soft' : 'bg-surface',
        current ? 'border-2 border-accent' : 'border border-border',
        muted ? 'opacity-[0.88]' : '',
      ].join(' ')}
      aria-label={`Lesson ${lesson.order}: ${lesson.title}. ${status === 'done' ? `${stars} of 3 stars` : status === 'current' ? 'Up next' : status === 'skipped' ? 'Skipped' : 'Locked'}`}
    >
      <div className="relative h-[100px] overflow-hidden bg-art-bg">
        <div aria-hidden className="absolute -bottom-[70%] -left-1/4 h-[110%] w-[95%] rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 11%, var(--surface))' }} />
        <div aria-hidden className="absolute -bottom-[78%] -right-[30%] h-[115%] w-[105%] rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 22%, var(--surface))' }} />
        <div className="absolute inset-0 flex items-center justify-center gap-1.5" aria-hidden>
          {isKeys ? (
            tiles(lesson.keys).map((t, i) => (
              <span
                key={i}
                className="flex h-[34px] min-w-[34px] items-center justify-center rounded-[10px] border-2 bg-surface px-[7px] text-[15px] font-extrabold text-accent"
                style={{ borderColor: 'color-mix(in srgb, var(--accent) 22%, var(--surface))', transform: `translateY(${[-4, 4, -3][i]}px)` }}
              >
                {t}
              </span>
            ))
          ) : (
            <span
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 bg-surface"
              style={{ borderColor: 'color-mix(in srgb, var(--accent) 22%, var(--surface))' }}
            >
              <TypeIcon type={lesson.type} />
            </span>
          )}
        </div>
        <span className="absolute left-2.5 top-2 rounded-full bg-surface px-2 py-0.5 text-[13px] font-extrabold">
          {String(lesson.order).padStart(2, '0')}
        </span>
        <span className="absolute right-2 top-[7px] flex">
          {status === 'done' && (
            <span className="flex gap-px rounded-full bg-surface px-[7px] py-[3px]" aria-hidden>
              {[1, 2, 3].map((k) => (
                <svg key={k} width="14" height="14" viewBox="0 0 24 24" style={{ fill: stars >= k ? '#e0a100' : 'var(--border)' }}>
                  <path d={STAR} />
                </svg>
              ))}
            </span>
          )}
          {current && <Pill className="bg-accent text-accent-contrast">Start</Pill>}
          {status === 'skipped' && <Pill className="bg-accent-soft text-accent">Skipped</Pill>}
          {locked && (
            <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-surface">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </span>
          )}
        </span>
      </div>
      <div className="border-t border-border px-3 pb-3.5 pt-3 text-center">
        <div className="text-[15px] font-bold tracking-tight">{lesson.title}</div>
        {target && <div className="mt-0.5 text-xs font-semibold text-accent">{target}</div>}
      </div>
    </Wrapper>
  )
}

/** Locked lessons are plain, unclickable cards; the rest link to the lesson. */
function Wrapper({ locked, to, children, ...rest }: { locked: boolean; to: string; children: ReactNode; id: string; className: string; 'aria-label': string }) {
  if (locked) {
    return (
      <div {...rest} aria-disabled="true" className={rest.className.replace(/hover:\S+/g, '') + ' cursor-not-allowed'}>
        {children}
      </div>
    )
  }
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  )
}

function Pill({ className, children }: { className: string; children: string }) {
  return <span className={['rounded-full px-2.5 py-[3px] text-xs font-bold', className].join(' ')}>{children}</span>
}
