import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TypingArea, type TypingResult } from '../components/typing/TypingArea'
import { issueDaily, issueTest, submitResult, touchStreak, type IssuedTest, type RankedResult } from '../lib/api'
import { useAuth } from '../storage/authStore'

type Phase = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'typing'; test: IssuedTest } | { kind: 'checking' } | { kind: 'done'; result: RankedResult } | { kind: 'rejected'; message: string }

/**
 * A ranked 30 or 60 second test, or today's daily challenge (60 s, same text for everyone).
 * The server picks the text and scores the keystroke log.
 */
export function Ranked({ daily = false }: { daily?: boolean }) {
  const [params] = useSearchParams()
  const duration: 30 | 60 = daily || params.get('d') === '60' ? 60 : 30
  const { ready, user } = useAuth()
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [round, setRound] = useState(0)

  useEffect(() => {
    if (!ready || !user) return
    let live = true
    setPhase({ kind: 'loading' })
    void (daily ? issueDaily() : issueTest(duration)).then(({ data, error }) => {
      if (!live) return
      setPhase(data ? { kind: 'typing', test: data } : { kind: 'error', message: error ?? 'Could not start the test.' })
    })
    return () => {
      live = false
    }
  }, [ready, user, duration, round, daily])

  const onFinish = useCallback(
    async (r: TypingResult) => {
      if (phase.kind !== 'typing') return
      setPhase({ kind: 'checking' })
      const { data, error } = await submitResult(phase.test.issueId, r.log)
      void touchStreak()
      setPhase(data ? { kind: 'done', result: data } : { kind: 'rejected', message: error ?? 'The result could not be counted.' })
    },
    [phase],
  )

  const again = () => setRound((n) => n + 1)

  if (ready && !user) {
    return (
      <main className="mx-auto flex max-w-[560px] flex-col items-center gap-4 px-6 py-14 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{daily ? 'Daily challenge' : 'Ranked test'}</h1>
        <p className="text-muted">Ranked results go on the leaderboard, so you need to be signed in (or play as a guest from Play with friends). Practice and casual typing work without one.</p>
        <Link to="/login" className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast">Log in or sign up</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-6 pb-16 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{daily ? 'Daily challenge' : `Ranked test · ${duration} s`}</h1>
        <div className={daily ? 'hidden' : 'flex gap-2'} role="group" aria-label="Test length">
          {([30, 60] as const).map((d) => (
            <Link
              key={d}
              to={`/ranked?d=${d}`}
              aria-current={d === duration ? 'page' : undefined}
              className={['rounded-full border px-4 py-2 text-sm font-semibold', d === duration ? 'border-accent bg-accent text-accent-contrast' : 'border-border bg-surface hover:bg-surface-2'].join(' ')}
            >
              {d} s
            </Link>
          ))}
        </div>
      </div>

      {phase.kind === 'loading' && <p className="text-center text-muted">Getting your text from the server…</p>}
      {phase.kind === 'error' && <Message text={phase.message} onAgain={again} />}
      {phase.kind === 'typing' && (
        <>
          <TypingArea key={phase.test.issueId} target={phase.test.text} timeLimitMs={duration * 1000} onFinish={onFinish} />
          <p className="text-center text-sm text-muted">
            The timer starts on your first key. Pasting is blocked, and your score is checked by the server.
          </p>
        </>
      )}
      {phase.kind === 'checking' && <p className="text-center text-muted" role="status">Checking your result…</p>}
      {phase.kind === 'rejected' && <Message text={phase.message} onAgain={again} />}
      {phase.kind === 'done' && <Verified result={phase.result} duration={duration} daily={daily} onAgain={again} />}
    </main>
  )
}

function Message({ text, onAgain }: { text: string; onAgain: () => void }) {
  return (
    <section role="alert" className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-8 text-center">
      <p className="text-lg font-semibold">{text}</p>
      <button type="button" onClick={onAgain} className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast">Try again</button>
    </section>
  )
}

function Verified({ result, duration, daily, onAgain }: { result: RankedResult; duration: number; daily: boolean; onAgain: () => void }) {
  return (
    <section aria-label="Result" className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{result.personalBest ? 'New personal best!' : 'Result'}</h2>
        <span className="flex items-center gap-2 rounded-full border border-border bg-bg px-3.5 py-1.5 text-[13px] font-semibold text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5L15.5 10" /></svg>
          Verified by the server
        </span>
      </div>
      <div className="flex flex-wrap gap-10">
        <Big value={String(Math.round(result.wpm))} label="WPM" accent />
        <Big value={`${result.accuracy}%`} label="Accuracy" />
        <Big value={String(Math.round(result.rawWpm))} label="Raw WPM" />
        {result.rank !== null && <Big value={`#${result.rank}`} label={daily ? 'Today' : `All-time, ${duration} s`} />}
      </div>
      {!result.qualifies && (
        <p className="text-sm text-muted">Leaderboards only count runs with at least 95% accuracy. Slow down a little and aim for clean typing.</p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onAgain} className="rounded-xl bg-accent px-7 py-3.5 font-bold text-accent-contrast hover:opacity-90">Go again</button>
        <Link to={daily ? '/leaderboard?tab=daily' : `/leaderboard?d=${duration}`} className="rounded-xl border border-border bg-bg px-6 py-3.5 font-bold hover:bg-surface-2">See leaderboard</Link>
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
