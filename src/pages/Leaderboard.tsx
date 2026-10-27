import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BoardTable } from '../components/leaderboard/BoardTable'
import { CASUAL_MODES, getCasualBoard, type BoardRow, type CasualMode } from '../lib/api'

/** Leaderboard from casual typing: one list per length, for everyone. */
export function Leaderboard() {
  const [params, setParams] = useSearchParams()
  const wanted = params.get('m')
  const mode: CasualMode = CASUAL_MODES.find((m) => m.value === wanted)?.value ?? '30s'
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setRows(null)
    void getCasualBoard(mode).then((r) => {
      if (!live) return
      setRows(r.rows)
      setError(r.error)
    })
    return () => {
      live = false
    }
  }, [mode])

  const tab = (on: boolean) =>
    ['rounded-[11px] px-4 py-2.5 text-[15px] font-bold sm:px-6', on ? 'bg-surface text-text shadow-[0_1px_3px_rgba(15,23,42,0.12)]' : 'text-muted hover:text-text'].join(' ')

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-6 pb-16 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <Link to="/casual/play" className="rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-contrast hover:opacity-90">Play casual typing</Link>
      </div>

      <div role="tablist" aria-label="Length" className="flex max-w-full flex-wrap gap-1 self-start rounded-[14px] bg-surface-2 p-1">
        {CASUAL_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={mode === m.value}
            className={tab(mode === m.value)}
            onClick={() => setParams(m.value === '30s' ? {} : { m: m.value }, { replace: true })}
          >
            {m.label}
          </button>
        ))}
      </div>

      <BoardTable rows={rows} error={error} showDuration={mode === 'endless'} empty="No results yet. Play casual typing while signed in to be first!" />
    </main>
  )
}
