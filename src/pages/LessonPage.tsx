import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Keyboard } from '../components/keyboard/Keyboard'
import { TypingArea, type TypingResult } from '../components/typing/TypingArea'
import { allowedKeys, LESSONS, lessonById, STAGE_NAMES } from '../content/lessons/catalog'
import { SHIFT, type LessonDef } from '../content/lessons/types'
import { TIPS } from '../content/tips'
import { targetForChar } from '../layouts/qwerty'
import { FINGER_NAMES } from '../layouts/types'
import { buildDrill, weakWeights } from '../engine/drill'
import { currentLesson, lessonStatus, starsFor } from '../engine/progress'
import { formatTime } from '../engine/stats'
import { touchStreak } from '../lib/api'
import { useProgress } from '../storage/progressStore'
import { useSettings } from '../stores/settings'

const STAR = 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z'

function newAttempt(lesson: LessonDef) {
  const seed = Math.floor(Math.random() * 2 ** 31)
  const weak = weakWeights(useProgress.getState().progress.keyStats)
  return { seed, text: buildDrill({ lesson, allowed: allowedKeys(lesson), weak, seed }) }
}

/** "Type E with your left middle finger" for each new key. */
function keyInstructions(lesson: LessonDef): string[] {
  return lesson.newKeys.map((k) => {
    if (k === SHIFT) return 'Hold Left Shift with your left pinky to type capitals with your right hand.'
    if (k === ' ') return 'Press the space bar with your thumb.'
    const t = targetForChar(k)
    const label = k.length === 1 && /[a-z]/.test(k) ? k.toUpperCase() : k
    return t ? `Type ${label} with your ${FINGER_NAMES[t.key.finger].toLowerCase()} finger.` : `Type ${label}.`
  })
}

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const lesson = lessonById(lessonId)
  const progress = useProgress((s) => s.progress)
  if (!lesson) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Lesson not found</h1>
        <Link to="/journey" className="mt-4 inline-block font-semibold text-accent">Back to Journey</Link>
      </main>
    )
  }
  // Lessons ahead stay locked until you reach them (or pass the level test).
  const current = currentLesson(LESSONS, progress)
  if (lessonStatus(lesson, progress, current) === 'locked') {
    return (
      <main className="mx-auto flex max-w-[560px] flex-col items-center gap-4 px-6 py-14 text-center">
        <h1 className="text-3xl font-bold">This lesson is locked</h1>
        <p className="text-muted">Finish the lessons before it first{current ? `: you are on lesson ${current.order}, ${current.title}` : ''}. Or use Test skill on the Journey to skip ahead.</p>
        <div className="flex gap-3">
          {current && <Link to={`/journey/${current.id}`} className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast">Go to lesson {current.order}</Link>}
          <Link to="/journey" className="rounded-xl border border-border bg-surface px-6 py-3 font-bold">Back to Journey</Link>
        </div>
      </main>
    )
  }
  // key: a different lesson starts completely fresh.
  return <Lesson key={lesson.id} lesson={lesson} />
}

function Lesson({ lesson }: { lesson: LessonDef }) {
  const navigate = useNavigate()
  const record = useProgress((s) => s.record)
  const { showKeyboard, set } = useSettings()
  const [attempt, setAttempt] = useState(() => newAttempt(lesson))
  const [result, setResult] = useState<{ wpm: number; accuracy: number; stars: number; durationMs: number } | null>(null)
  const next = LESSONS[lesson.order] // order is 1-based, so this is the following lesson

  const onFinish = useCallback(
    (r: TypingResult) => {
      const wpm = Math.round(r.summary.wpm)
      const accuracy = Math.round(r.summary.accuracy)
      record(lesson, wpm, accuracy, r.keyStats)
      void touchStreak()
      setResult({ wpm, accuracy, stars: starsFor(lesson, wpm, accuracy), durationMs: r.summary.durationMs })
    },
    [lesson, record],
  )

  const retry = () => {
    setResult(null)
    setAttempt(newAttempt(lesson))
  }

  const pill = (on: boolean) =>
    [
      'rounded-full border px-3.5 py-2 text-sm font-semibold',
      on ? 'border-accent bg-accent text-accent-contrast' : 'border-border bg-surface text-muted hover:text-text',
    ].join(' ')

  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 pb-16 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <Link to="/journey" aria-label="Back to Journey" className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface hover:bg-surface-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
              Lesson {lesson.order} · {STAGE_NAMES[lesson.stage]}
            </div>
            <h1 className="text-xl font-bold tracking-tight">{lesson.title}</h1>
          </div>
        </div>
        {lesson.type !== 'intro' && (
          <div className="flex gap-2">
            <button type="button" aria-pressed={showKeyboard} className={pill(showKeyboard)} onClick={() => set({ showKeyboard: !showKeyboard })}>Keyboard</button>
          </div>
        )}
      </div>

      {lesson.type === 'intro' ? (
        <IntroLesson
          lesson={lesson}
          onDone={() => {
            record(lesson, 0, 0, {})
            navigate(next ? `/journey/${next.id}` : '/journey')
          }}
        />
      ) : result ? (
        <ResultCard lesson={lesson} result={result} next={next} onRetry={retry} />
      ) : (
        <>
          <div className="flex flex-col gap-1 text-center text-[15px] text-muted">
            {keyInstructions(lesson).map((line) => (
              <p key={line} className="font-semibold text-text">{line}</p>
            ))}
            <p>
              Pass: {lesson.pass.accuracy}% accuracy and {lesson.pass.wpm} WPM
              {lesson.timeLimitMs ? ` · ${formatTime(lesson.timeLimitMs)} timed` : ''}
              {lesson.mode === 'stop-on-error' ? ' · fix each mistake to move on' : ''}
            </p>
          </div>
          <TypingArea
            key={attempt.seed}
            target={attempt.text}
            mode={lesson.mode}
            timeLimitMs={lesson.timeLimitMs}
            showKeyboard={showKeyboard}
            dimKeyboard={lesson.stage >= 3}
            onFinish={onFinish}
          />
          <p className="text-center text-sm text-muted">
            <b className="text-text">Tip:</b> {TIPS[lesson.tipId]}
          </p>
        </>
      )}
    </main>
  )
}

function IntroLesson({ lesson, onDone }: { lesson: LessonDef; onDone: () => void }) {
  const posture = lesson.variant === 'posture'
  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
      {posture ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            'Sit up straight with both feet flat on the floor.',
            'Keep the screen at eye level, about an arm away.',
            'Relax your shoulders and keep your wrists slightly raised.',
            'Look at the screen, not your hands. It feels slow at first; that is normal.',
          ].map((t, i) => (
            <li key={t} className="flex items-start gap-3 rounded-2xl bg-bg p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{i + 1}</span>
              <span className="text-[15px] leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="text-center text-[15px] leading-relaxed">
            Rest your left fingers on <b>A S D F</b> and your right fingers on <b>J K L ;</b>. Your thumbs rest on the space bar.
            Feel the small bumps on <b>F</b> and <b>J</b>: they let you find home without looking.
          </p>
          <Keyboard activeChar="f" />
        </>
      )}
      <p className="text-center text-sm text-muted"><b className="text-text">Tip:</b> {TIPS[lesson.tipId]}</p>
      <button type="button" onClick={onDone} className="self-center rounded-xl bg-accent px-10 py-3.5 text-base font-bold text-accent-contrast hover:opacity-90">
        I'm ready
      </button>
    </section>
  )
}

function ResultCard({
  lesson,
  result,
  next,
  onRetry,
}: {
  lesson: LessonDef
  result: { wpm: number; accuracy: number; stars: number; durationMs: number }
  next?: LessonDef
  onRetry: () => void
}) {
  const passed = result.stars > 0
  const heading = !passed ? 'Not quite yet' : lesson.type === 'checkpoint' ? `${STAGE_NAMES[lesson.stage]} complete!` : 'Lesson passed'
  const missing: string[] = []
  if (result.accuracy < lesson.pass.accuracy) missing.push(`${lesson.pass.accuracy}% accuracy`)
  if (result.wpm < lesson.pass.wpm) missing.push(`${lesson.pass.wpm} WPM`)

  return (
    <section aria-label="Result" className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-surface p-8 text-center">
      <div className="flex gap-2" role="img" aria-label={`${result.stars} of 3 stars`}>
        {[1, 2, 3].map((k) => (
          <svg key={k} width="44" height="44" viewBox="0 0 24 24" style={{ fill: result.stars >= k ? '#e0a100' : 'var(--border)' }} aria-hidden>
            <path d={STAR} />
          </svg>
        ))}
      </div>
      <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
      <div className="flex flex-wrap justify-center gap-10">
        <Big value={String(result.wpm)} label="WPM" accent />
        <Big value={`${result.accuracy}%`} label="Accuracy" />
        <Big value={formatTime(result.durationMs)} label="Time" />
      </div>
      {!passed && <p className="text-muted">You need {missing.join(' and ')} to pass. Take a breath and try again.</p>}
      <div className="flex flex-wrap justify-center gap-3">
        {passed && next && (
          <Link to={`/journey/${next.id}`} className="rounded-xl bg-accent px-8 py-3.5 font-bold text-accent-contrast hover:opacity-90">
            Next lesson
          </Link>
        )}
        <button
          type="button"
          onClick={onRetry}
          className={passed ? 'rounded-xl border border-border bg-surface px-6 py-3.5 font-bold hover:bg-surface-2' : 'rounded-xl bg-accent px-8 py-3.5 font-bold text-accent-contrast hover:opacity-90'}
        >
          Try again
        </button>
        <Link to="/journey" className="rounded-xl border border-border bg-surface px-6 py-3.5 font-bold hover:bg-surface-2">
          Back to Journey
        </Link>
      </div>
    </section>
  )
}

function Big({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={['text-4xl font-extrabold tracking-tight tabular-nums', accent ? 'text-accent' : ''].join(' ')}>{value}</div>
      <div className="text-[13px] font-semibold text-muted">{label}</div>
    </div>
  )
}
