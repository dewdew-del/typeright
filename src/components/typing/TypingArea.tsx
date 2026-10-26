import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import type { Keystroke, KeyStat, Summary, TypingMode } from '../../../supabase/functions/_shared/scoring'
import { keyFromEvent } from '../../engine/keys'
import { elapsedMs, type TypingSession } from '../../engine/session'
import { formatTime } from '../../engine/stats'
import { useTypingSession } from '../../engine/useTypingSession'
import { targetForChar } from '../../layouts/qwerty'
import { playKeySound } from '../../lib/sound'
import { useSettings, type TextSize } from '../../stores/settings'
import { HandGuide } from '../keyboard/HandGuide'
import { Keyboard } from '../keyboard/Keyboard'

export interface TypingResult {
  summary: Summary
  log: Keystroke[]
  keyStats: Record<string, KeyStat>
  /** The full text as it stood at the end (endless mode grows it). */
  target: string
  mode: TypingMode
}

interface Props {
  target: string
  mode?: TypingMode
  /** Timed test length; omit for "type the whole text". */
  timeLimitMs?: number
  showKeyboard?: boolean
  /** Fade the keyboard so learners rely on it less ("no-look" practice). */
  dimKeyboard?: boolean
  /** Show the hand diagram with the finger for the next key. */
  showHands?: boolean
  /** Endless mode: called for more text when the end is near. */
  getMore?: () => string
  /** Increment to end the session now ("Finish"). */
  finishSignal?: number
  onFinish?: (result: TypingResult) => void
}

const VISIBLE_LINES = 3
const SIZE_CLASS: Record<TextSize, string> = {
  sm: 'text-lg sm:text-[22px]',
  md: 'text-xl sm:text-[26px]',
  lg: 'text-2xl sm:text-[32px]',
}

/**
 * The text to type with live WPM, accuracy and time. Captures keys only while focused.
 * Long texts show three lines at a time and scroll as you type.
 */
export function TypingArea({
  target,
  mode = 'free',
  timeLimitMs,
  showKeyboard = false,
  dimKeyboard = false,
  showHands = false,
  getMore,
  finishSignal = 0,
  onFinish,
}: Props) {
  const { session, stats, ended, onKey, extend, finish, now } = useTypingSession(target, mode, timeLimitMs)
  const { sound, textSize } = useSettings()
  const boxRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)
  const [focused, setFocused] = useState(false)
  const reported = useRef<TypingSession | null>(null)

  const text = session.replay.target
  const typed = session.replay.typed
  const cursor = typed.length

  useEffect(() => {
    boxRef.current?.focus()
  }, [target])

  useEffect(() => {
    if (finishSignal > 0) finish()
  }, [finishSignal, finish])

  // Endless: keep at least a few lines of text ahead of the cursor.
  useEffect(() => {
    if (getMore && !ended && text.length - cursor < 150) extend(' ' + getMore())
  }, [getMore, ended, text.length, cursor, extend])

  useEffect(() => {
    if (!ended || reported.current === session) return
    reported.current = session
    onFinish?.({ summary: stats, log: session.log.slice(), keyStats: session.replay.keyStats, target: text, mode })
  }, [ended, session, stats, onFinish, text, mode])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const key = keyFromEvent(e.nativeEvent)
    if (key === null) return
    e.preventDefault() // keep Space from scrolling and Backspace from navigating
    if (sound && !ended) playKeySound(key === 'Backspace' || key === text[cursor])
    onKey(key)
  }

  // Keep the line with the cursor in view: the line above it stays visible for context.
  useLayoutEffect(() => {
    const content = contentRef.current
    const cur = cursorRef.current
    if (!content) return
    if (!cur) {
      if (cursor === 0) content.style.transform = ''
      return
    }
    const line = parseFloat(getComputedStyle(content).lineHeight) || 40
    const offset = Math.max(0, cur.offsetTop - line)
    content.style.transform = `translateY(-${offset}px)`
  }, [cursor, text, textSize])

  const elapsed = elapsedMs(session, now)
  const clock = timeLimitMs === undefined ? formatTime(elapsed) : formatTime(timeLimitMs - elapsed)

  // Group characters into words so lines only break between words.
  const words: { start: number; text: string }[] = []
  for (const m of text.matchAll(/\S+\s*|\s+/g)) words.push({ start: m.index ?? 0, text: m[0] })

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap justify-center gap-10" aria-live="off">
        <Stat value={String(Math.round(stats.wpm))} label="WPM" accent />
        <Stat value={`${Math.round(stats.accuracy)}%`} label="Accuracy" />
        <Stat value={clock} label={timeLimitMs === undefined ? (getMore ? 'Endless' : 'Time') : 'Left'} />
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
        <div
          className={['overflow-hidden font-mono leading-[1.8]', SIZE_CLASS[textSize]].join(' ')}
          style={{ maxHeight: `${1.8 * VISIBLE_LINES}em` }}
        >
          <div
            ref={contentRef}
            className={['relative transition-transform duration-150', focused ? '' : 'blur-[3px]'].join(' ')}
          >
            {words.map(({ start, text: word }) => (
              <span key={start} className="inline-block whitespace-pre">
                {[...word].map((ch, j) => {
                  const i = start + j
                  const isCursor = i === cursor && !ended
                  return <Char key={i} ch={ch} typed={typed[i]} isCursor={isCursor} spanRef={isCursor ? cursorRef : undefined} />
                })}
              </span>
            ))}
          </div>
        </div>
        {!focused && !ended && (
          <div className="absolute inset-0 grid place-items-center rounded-3xl text-base font-semibold text-muted">
            Click here or press Tab to start typing
          </div>
        )}
      </div>

      {showKeyboard && (
        <div className={dimKeyboard ? 'opacity-45 transition-opacity hover:opacity-100' : ''}>
          <Keyboard activeChar={ended ? undefined : text[cursor]} />
        </div>
      )}
      {showHands && <HandGuide active={ended ? undefined : targetForChar(text[cursor] ?? '')?.key.finger} />}
    </div>
  )
}

function Char({ ch, typed, isCursor, spanRef }: { ch: string; typed?: string; isCursor: boolean; spanRef?: Ref<HTMLSpanElement> }) {
  const shown = ch === ' ' ? ' ' : ch
  let cls = 'text-muted'
  if (typed !== undefined) cls = typed === ch ? 'text-good' : 'rounded-sm bg-bad/15 text-bad'
  else if (isCursor) cls = 'rounded-sm bg-accent/15 text-accent'
  return (
    <span ref={spanRef} className={['relative', cls].join(' ')}>
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
