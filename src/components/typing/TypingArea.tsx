import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Keystroke, KeyStat, Summary, TypingMode } from '../../../supabase/functions/_shared/scoring'
import { keyFromEvent } from '../../engine/keys'
import { elapsedMs, type TypingSession } from '../../engine/session'
import { formatTime } from '../../engine/stats'
import { useTypingSession } from '../../engine/useTypingSession'
import { Keyboard } from '../keyboard/Keyboard'

export interface TypingResult {
  summary: Summary
  log: Keystroke[]
  keyStats: Record<string, KeyStat>
}

interface Props {
  target: string
  mode?: TypingMode
  /** Timed test length; omit for "type the whole text". */
  timeLimitMs?: number
  showKeyboard?: boolean
  onFinish?: (result: TypingResult) => void
}

/** The text to type with live WPM, accuracy and time. Captures keys only while focused. */
export function TypingArea({ target, mode = 'free', timeLimitMs, showKeyboard = false, onFinish }: Props) {
  const { session, stats, ended, onKey, now } = useTypingSession(target, mode, timeLimitMs)
  const boxRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const reported = useRef<TypingSession | null>(null)

  useEffect(() => {
    boxRef.current?.focus()
  }, [target])

  useEffect(() => {
    if (!ended || reported.current === session) return
    reported.current = session
    onFinish?.({ summary: stats, log: session.log.slice(), keyStats: session.replay.keyStats })
  }, [ended, session, stats, onFinish])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const key = keyFromEvent(e.nativeEvent)
    if (key === null) return
    e.preventDefault() // keep Space from scrolling and Backspace from navigating
    onKey(key)
  }

  const typed = session.replay.typed
  const cursor = typed.length
  const elapsed = elapsedMs(session, now)
  const clock = timeLimitMs === undefined ? formatTime(elapsed) : formatTime(timeLimitMs - elapsed)

  // Group characters into words so lines only break between words.
  const words: { start: number; text: string }[] = []
  for (const m of target.matchAll(/\S+\s*|\s+/g)) words.push({ start: m.index ?? 0, text: m[0] })

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap justify-center gap-10" aria-live="off">
        <Stat value={String(Math.round(stats.wpm))} label="WPM" accent />
        <Stat value={`${Math.round(stats.accuracy)}%`} label="Accuracy" />
        <Stat value={clock} label={timeLimitMs === undefined ? 'Time' : 'Left'} />
      </div>

      <div
        ref={boxRef}
        tabIndex={0}
        role="textbox"
        aria-label="Typing area. Type the text shown. Pasting is disabled."
        aria-readonly="true"
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        className="relative cursor-text rounded-3xl border border-border bg-surface px-6 py-8 outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-9 sm:py-10"
      >
        <div className={['font-mono text-xl leading-[1.8] sm:text-[26px]', focused ? '' : 'blur-[3px]'].join(' ')}>
          {words.map(({ start, text }) => (
            <span key={start} className="inline-block whitespace-pre">
              {[...text].map((ch, j) => {
                const i = start + j
                return <Char key={i} ch={ch} typed={typed[i]} isCursor={i === cursor && !ended} />
              })}
            </span>
          ))}
        </div>
        {!focused && !ended && (
          <div className="absolute inset-0 grid place-items-center rounded-3xl text-base font-semibold text-muted">
            Click here or press Tab to start typing
          </div>
        )}
      </div>

      {showKeyboard && <Keyboard activeChar={ended ? undefined : target[cursor]} />}
    </div>
  )
}

function Char({ ch, typed, isCursor }: { ch: string; typed?: string; isCursor: boolean }) {
  const shown = ch === ' ' ? ' ' : ch
  let cls = 'text-muted'
  if (typed !== undefined) cls = typed === ch ? 'text-good' : 'rounded-sm bg-bad/15 text-bad'
  else if (isCursor) cls = 'rounded-sm bg-accent/15 text-accent'
  return (
    <span className={['relative', cls].join(' ')}>
      {isCursor && (
        <span aria-hidden className="caret absolute -left-px top-[0.2em] h-[1.1em] w-[3px] rounded-full bg-accent" />
      )}
      {shown}
    </span>
  )
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className={['text-4xl font-extrabold tracking-tight tabular-nums', accent ? 'text-accent' : ''].join(' ')}>
        {value}
      </div>
      <div className="text-[13px] font-semibold text-muted">{label}</div>
    </div>
  )
}
