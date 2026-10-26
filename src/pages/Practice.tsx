import { useCallback, useState } from 'react'
import type { TypingMode } from '../../supabase/functions/_shared/scoring'
import { TypingArea, type TypingResult } from '../components/typing/TypingArea'
import { SENTENCES_EN } from '../content/sentences/en'
import { formatTime, keyLabel, topMissedKeys } from '../engine/stats'

// Stage 2 test page for the typing engine. Casual typing and lessons reuse TypingArea later.
const LIMITS: { label: string; ms?: number }[] = [{ label: 'Whole text' }, { label: '30 s', ms: 30_000 }, { label: '60 s', ms: 60_000 }]

const pick = (not?: string) => {
  const pool = SENTENCES_EN.filter((s) => s !== not)
  return pool[Math.floor(Math.random() * pool.length)]
}

export function Practice() {
  const [mode, setMode] = useState<TypingMode>('free')
  const [limit, setLimit] = useState(0)
  const [showKeyboard, setShowKeyboard] = useState(true)
  const [text, setText] = useState(() => pick())
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<TypingResult | null>(null)

  const timeLimitMs = LIMITS[limit].ms
  // Timed tests need more text than one sentence.
  const target = timeLimitMs === undefined ? text : [text, ...SENTENCES_EN.filter((s) => s !== text)].join(' ')

  const restart = () => {
    setResult(null)
    setText(pick(text))
    setRound((r) => r + 1)
  }
  const onFinish = useCallback((r: TypingResult) => setResult(r), [])

  const chip = (on: boolean) =>
    [
      'rounded-full border px-4 py-2 text-sm font-semibold',
      on ? 'border-accent bg-accent text-accent-contrast' : 'border-border bg-surface text-text hover:bg-surface-2',
    ].join(' ')

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-6 pb-16 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Practice</h1>
        <button type="button" onClick={restart} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold hover:bg-surface-2">
          New text
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Options">
        {LIMITS.map((l, i) => (
          <button key={l.label} type="button" aria-pressed={limit === i} className={chip(limit === i)} onClick={() => { setLimit(i); restart() }}>
            {l.label}
          </button>
        ))}
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
        <button type="button" aria-pressed={mode === 'free'} className={chip(mode === 'free')} onClick={() => { setMode('free'); restart() }}>
          Free (Backspace allowed)
        </button>
        <button type="button" aria-pressed={mode === 'stop-on-error'} className={chip(mode === 'stop-on-error')} onClick={() => { setMode('stop-on-error'); restart() }}>
          Stop on error
        </button>
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
        <button type="button" aria-pressed={showKeyboard} className={chip(showKeyboard)} onClick={() => setShowKeyboard((v) => !v)}>
          Keyboard
        </button>
      </div>

      <TypingArea key={round} target={target} mode={mode} timeLimitMs={timeLimitMs} showKeyboard={showKeyboard && !result} onFinish={onFinish} />

      {result && (
        <section aria-label="Result" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6">
          <div className="flex flex-wrap gap-8">
            <Big label="WPM" value={Math.round(result.summary.wpm)} accent />
            <Big label="Raw WPM" value={Math.round(result.summary.rawWpm)} />
            <Big label="Accuracy" value={`${Math.round(result.summary.accuracy)}%`} />
            <Big label="Time" value={formatTime(result.summary.durationMs)} />
            <Big label="Keystrokes logged" value={result.log.length} />
          </div>
          <div>
            <div className="mb-2 text-sm font-bold">Most missed keys</div>
            {topMissedKeys(result.keyStats).length === 0 ? (
              <p className="text-sm text-muted">No misses. Nice.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topMissedKeys(result.keyStats).map((k) => (
                  <span key={k.char} className="rounded-xl border border-border bg-bg px-3 py-1.5 text-sm">
                    <b className="text-accent">{keyLabel(k.char)}</b> <span className="text-muted">{k.misses} of {k.attempts}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={restart} className="self-start rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast hover:opacity-90">
            Try again
          </button>
        </section>
      )}
    </main>
  )
}

function Big({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <div className={['text-3xl font-extrabold tracking-tight tabular-nums', accent ? 'text-accent' : ''].join(' ')}>{value}</div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </div>
  )
}
