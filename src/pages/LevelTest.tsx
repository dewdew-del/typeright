import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TypingArea, type TypingResult } from '../components/typing/TypingArea'
import { allowedKeys, STAGE_NAMES, STAGE_TARGET_ACCURACY, STAGE_TARGET_WPM } from '../content/lessons/catalog'
import { buildDrill } from '../engine/drill'
import { floorAccuracy, formatAccuracy } from '../engine/stats'
import { LEVEL_STEPS, passedStages, placement, STEP_MS, stepCleared, stepLesson, type StepResult } from '../engine/levelTest'
import { useProgress } from '../storage/progressStore'

type Phase = 'intro' | 'test' | 'result'

export function LevelTest() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [results, setResults] = useState<StepResult[]>([])
  const setTestedOut = useProgress((s) => s.setTestedOut)

  const finish = (all: StepResult[]) => {
    setTestedOut(placement(all).testedOut)
    setResults(all)
    setPhase('result')
  }

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-7 px-6 pb-16 pt-2">
      {phase === 'intro' && <Intro onStart={() => { setResults([]); setPhase('test') }} />}
      {phase === 'test' && <TestRun onDone={finish} />}
      {phase === 'result' && <Result results={results} onRetake={() => setPhase('intro')} />}
    </main>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  const facts = [
    { text: 'Takes about 2 minutes', icon: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2.5h5" /></> },
    { text: 'Optional, and you can stop any time', icon: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5h5v5h-5z" /></> },
    { text: 'Pass a stage and you skip it', icon: <path d="M5 5l7 7-7 7M13 5l7 7-7 7" /> },
  ]
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-7">
      <section aria-hidden className="overflow-hidden rounded-3xl border border-border bg-art-bg">
        <svg viewBox="0 0 640 190" className="block h-auto w-full">
          <path className="art-t4" d="M0 120 Q160 80 330 112 T640 92 V190 H0Z" />
          <path className="art-t3" d="M0 160 Q200 128 380 154 T640 140 V190 H0Z" />
          <rect className="art-t3" x="110" y="130" width="90" height="40" rx="8" />
          <rect className="art-t2" x="200" y="104" width="90" height="66" rx="8" />
          <rect className="art-t2" x="290" y="78" width="90" height="92" rx="8" />
          <rect className="art-t1" x="380" y="52" width="90" height="118" rx="8" />
          <circle className="art-t1" cx="155" cy="112" r="12" /><path d="M149 112l4.5 4.5L162 107" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="art-t1" cx="245" cy="86" r="12" /><path d="M239 86l4.5 4.5L252 81" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="art-fs art-s1" cx="335" cy="60" r="12" strokeWidth="3" />
          <text x="335" y="65" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--accent)">?</text>
          <path d="M425 52V18" className="art-s1" strokeWidth="3" strokeLinecap="round" />
          <path d="M425 18l30 9-30 10z" fill="var(--accent-contrast)" />
        </svg>
      </section>
      <h1 className="text-center text-[34px] font-bold tracking-tight">Test your skill</h1>
      <ul className="flex flex-col gap-3">
        {facts.map((f) => (
          <li key={f.text} className="flex items-center gap-4 rounded-[18px] border border-border bg-surface px-5 py-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{f.icon}</svg>
            </span>
            <span className="text-[17px] font-semibold">{f.text}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-center gap-3.5">
        <button type="button" onClick={onStart} className="w-full rounded-2xl bg-accent py-4 text-lg font-bold text-accent-contrast hover:opacity-90">
          Start test
        </button>
        <Link to="/journey" className="text-[15px] font-semibold text-muted hover:text-text">Not now</Link>
      </div>
    </div>
  )
}

function TestRun({ onDone }: { onDone: (results: StepResult[]) => void }) {
  const [step, setStep] = useState(0)
  const [results, setResults] = useState<StepResult[]>([])
  const current = LEVEL_STEPS[step]
  const text = useMemo(() => {
    const lesson = stepLesson(current)
    // Long enough that nobody runs out of text within the time.
    return buildDrill({ lesson: { ...lesson, length: 600 }, allowed: allowedKeys(lesson), seed: Math.floor(Math.random() * 2 ** 31) })
  }, [current])

  const onFinish = useCallback(
    (r: TypingResult) => {
      const res = { wpm: Math.round(r.summary.wpm), accuracy: floorAccuracy(r.summary.accuracy) }
      const all = [...results, res]
      if (stepCleared(current, res) && step + 1 < LEVEL_STEPS.length) {
        setResults(all)
        setStep(step + 1)
      } else {
        onDone(all)
      }
    },
    [results, current, step, onDone],
  )

  const last = results[results.length - 1]

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Test your skill</h1>
        <button type="button" onClick={() => onDone(results)} className="rounded-full border border-border bg-surface px-[18px] py-[9px] text-sm font-bold hover:bg-surface-2">
          Stop test
        </button>
      </div>
      <ol aria-label="Test steps" className="flex flex-wrap justify-center gap-x-2 gap-y-2.5">
        {LEVEL_STEPS.map((s, i) => {
          const done = i < step
          const cur = i === step
          return (
            <li
              key={s.label}
              aria-current={cur ? 'step' : undefined}
              className={[
                'flex items-center gap-2 rounded-full py-1.5 pl-[7px] pr-3.5 text-sm font-semibold',
                cur ? 'bg-accent text-accent-contrast' : done ? 'bg-accent-soft text-accent' : 'border border-border bg-surface text-muted',
              ].join(' ')}
            >
              <span
                className={[
                  'grid h-[22px] w-[22px] place-items-center rounded-full text-xs font-extrabold',
                  cur ? 'bg-accent-contrast text-accent' : done ? 'bg-accent text-accent-contrast' : 'bg-bg text-muted',
                ].join(' ')}
              >
                {done ? '✓' : i + 1}
              </span>
              {s.label}
            </li>
          )
        })}
      </ol>
      {last && step > 0 && (
        <p className="text-center text-[15px] font-semibold text-good" role="status">
          {LEVEL_STEPS[step - 1].label} passed ({last.wpm} WPM, {last.accuracy}%). Next: {current.label}. Start typing when ready.
        </p>
      )}
      <TypingArea key={step} target={text} timeLimitMs={STEP_MS} onFinish={onFinish} />
      <p className="text-center text-sm text-muted">Type as you normally would. Each step lasts 20 seconds and starts on your first key.</p>
    </>
  )
}

function Result({ results, onRetake }: { results: StepResult[]; onRetake: () => void }) {
  const navigate = useNavigate()
  const { testedOut, startStage } = placement(results)
  const avg = (k: keyof StepResult) => (results.length ? Math.round(results.reduce((s, r) => s + r[k], 0) / results.length) : 0)

  const rows = LEVEL_STEPS.map((step, i) => {
    const r = results[i]
    if (!r) return null
    const passed = passedStages(step, r)
    const missedStage = step.stages.find((s) => !passed.includes(s))
    return { step, r, passed, missedStage }
  }).filter((x) => x !== null)

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5">
      <section className="rounded-3xl border border-border bg-accent-soft p-7 text-center">
        <div className="text-sm font-bold text-muted">You start at</div>
        <div className="mt-1 text-3xl font-extrabold tracking-tight">
          {startStage === 0 ? 'The beginning' : `Stage ${startStage}: ${STAGE_NAMES[startStage]}`}
        </div>
        <div className="mt-4 flex justify-center gap-8">
          <div><div className="text-3xl font-extrabold text-accent">{avg('wpm')}</div><div className="text-[13px] font-semibold text-muted">WPM</div></div>
          <div><div className="text-3xl font-extrabold">{results.length ? formatAccuracy(results.reduce((s, r) => s + r.accuracy, 0) / results.length) : 0}%</div><div className="text-[13px] font-semibold text-muted">Accuracy</div></div>
        </div>
      </section>

      <section aria-label="Stage results" className="flex flex-col gap-2.5">
        {rows.map(({ step, r, passed, missedStage }) => (
          <div key={step.label} className={['flex items-center gap-3.5 rounded-[18px] bg-surface px-[18px] py-4', missedStage !== undefined ? 'border-2 border-accent' : 'border border-border'].join(' ')}>
            <span className={['grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full font-extrabold', missedStage === undefined ? 'bg-accent text-accent-contrast' : 'bg-accent-soft text-accent'].join(' ')} aria-hidden>
              {missedStage === undefined ? '✓' : '⚑'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{step.label}</span>
              <span className="block text-[13px] text-muted">
                {r.wpm} WPM, {r.accuracy}%
                {missedStage !== undefined && `. Stage ${missedStage} needs ${STAGE_TARGET_WPM[missedStage]} WPM and ${STAGE_TARGET_ACCURACY[missedStage]}%`}
              </span>
            </span>
            <span className={['whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold', missedStage === undefined ? 'bg-accent-soft text-accent' : 'bg-accent text-accent-contrast'].join(' ')}>
              {missedStage === undefined ? `Skipped ${passed.length > 1 ? `stages ${passed[0]}-${passed[passed.length - 1]}` : `stage ${passed[0]}`}` : 'Start here'}
            </span>
          </div>
        ))}
        {rows.length < LEVEL_STEPS.length && (
          <div className="flex items-center gap-3.5 rounded-[18px] border border-border bg-surface px-[18px] py-4 text-muted">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-bg" aria-hidden>–</span>
            <span>Later stages: not tested</span>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 pt-1.5">
        <button type="button" onClick={() => navigate('/journey')} className="rounded-2xl bg-accent py-4 text-lg font-bold text-accent-contrast hover:opacity-90">
          Go to my journey
        </button>
        <button type="button" onClick={onRetake} className="rounded-2xl border border-border bg-surface py-3.5 font-bold hover:bg-surface-2">
          Retake test
        </button>
      </div>
      <p className="text-center text-[13px] leading-relaxed text-muted">
        {testedOut.length > 0 ? 'Skipped lessons stay open if you want to practice them. ' : ''}
        The test measures what you type, not which fingers you use. The lessons can still help you build good habits.
      </p>
    </div>
  )
}
