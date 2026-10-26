import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResultsView } from '../components/results/ResultsView'
import { TypingArea, type TypingResult } from '../components/typing/TypingArea'
import type { LessonDef } from '../content/lessons/types'
import { buildDrill, weakWeights } from '../engine/drill'
import { keyLabel, slowestKeys, topMissedKeys } from '../engine/stats'
import { useProgress } from '../storage/progressStore'

const LETTERS = new Set([' ', ...'abcdefghijklmnopqrstuvwxyz'])

/** The keys to drill: most missed first, then slowest. Letters only, so drills stay readable. */
function weakLetters(stats: Parameters<typeof topMissedKeys>[0]): string[] {
  const missed = topMissedKeys(stats, 6).map((k) => k.char.toLowerCase())
  const slow = slowestKeys(stats, 4).map((k) => k.char.toLowerCase())
  return [...new Set([...missed, ...slow])].filter((c) => /^[a-z]$/.test(c)).slice(0, 6)
}

function weakDrill(focus: string[], weak: Record<string, number>): string {
  const lesson: LessonDef = {
    id: 'weak-keys',
    order: 0,
    stage: 9,
    type: 'review',
    title: 'My weak keys',
    keys: '',
    newKeys: [],
    focus,
    style: 'words',
    mode: 'free',
    length: 260,
    pass: { accuracy: 0, wpm: 0 },
    tipId: 'accuracy',
  }
  return buildDrill({ lesson, allowed: LETTERS, weak, seed: Math.floor(Math.random() * 2 ** 31) })
}

/** Weak-keys practice: words built around the keys you miss or slow down on most. */
export function Practice() {
  const progress = useProgress((s) => s.progress)
  const addKeyStats = useProgress((s) => s.addKeyStats)
  const [focus] = useState(() => weakLetters(progress.keyStats))
  const [text, setText] = useState(() => weakDrill(focus, weakWeights(progress.keyStats)))
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<TypingResult | null>(null)

  const onFinish = useCallback(
    (r: TypingResult) => {
      addKeyStats(r.keyStats)
      setResult(r)
    },
    [addKeyStats],
  )

  const again = () => {
    setResult(null)
    setText(weakDrill(focus, weakWeights(useProgress.getState().progress.keyStats)))
    setRound((n) => n + 1)
  }

  if (focus.length === 0) {
    return (
      <main className="mx-auto flex max-w-[680px] flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Weak-keys practice</h1>
        <p className="text-muted">Type a lesson or a casual test first. We will learn which keys slow you down and build practice around them.</p>
        <div className="flex gap-3">
          <Link to="/journey" className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast">Go to Journey</Link>
          <Link to="/casual" className="rounded-xl border border-border bg-surface px-6 py-3 font-bold">Casual typing</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-6 pb-16 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Weak-keys practice</h1>
        <div className="flex flex-wrap items-center gap-2" aria-label="Keys in this practice">
          {focus.map((c) => (
            <span key={c} className="grid h-8 min-w-8 place-items-center rounded-lg border-2 bg-surface px-2 text-sm font-extrabold text-accent" style={{ borderColor: 'color-mix(in srgb, var(--accent) 25%, var(--surface))' }}>
              {keyLabel(c)}
            </span>
          ))}
        </div>
      </div>
      {result ? (
        <ResultsView result={result}>
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={again} className="rounded-xl bg-accent px-8 py-3.5 text-[17px] font-bold text-accent-contrast hover:opacity-90">Practice again</button>
            <Link to="/play" className="rounded-xl border border-border bg-surface px-7 py-3.5 text-[17px] font-bold hover:bg-surface-2">Back to menu</Link>
          </div>
        </ResultsView>
      ) : (
        <TypingArea key={round} target={text} showKeyboard onFinish={onFinish} />
      )}
    </main>
  )
}
