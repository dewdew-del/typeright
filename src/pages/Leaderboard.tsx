import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BoardTable } from '../components/leaderboard/BoardTable'
import { Overlay } from '../components/layout/Overlay'
import { CASUAL_MODES, getCasualBoard, type BoardRow, type CasualMode } from '../lib/api'
import { useOnline } from '../lib/online'
import { useUi } from '../stores/settings'

/** The leaderboard as a pop-up: one list per casual length, for everyone. */
export function LeaderboardDialog() {
  const { panel, close } = useUi()
  const [mode, setMode] = useState<CasualMode>('30s')
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const open = panel === 'leaderboard'
  const online = useOnline()

  useEffect(() => {
    if (!open || !online) return
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
  }, [open, mode, online])

  if (!open) return null

  const tab = (on: boolean) =>
    ['rounded-[11px] px-3.5 py-2 text-[15px] font-bold sm:px-5', on ? 'bg-surface text-text shadow-[0_1px_3px_rgba(15,23,42,0.12)]' : 'text-muted hover:text-text'].join(' ')

  return (
    <Overlay title="Leaderboard" onClose={close} wide>
      <div role="tablist" aria-label="Length" className="flex max-w-full flex-wrap gap-1 self-start rounded-[14px] bg-surface-2 p-1">
        {CASUAL_MODES.map((m) => (
          <button key={m.value} type="button" role="tab" aria-selected={mode === m.value} className={tab(mode === m.value)} onClick={() => setMode(m.value)}>
            {m.label}
          </button>
        ))}
      </div>
      <BoardTable rows={online ? rows : []} error={online ? error : 'The leaderboard needs internet. It loads when you are back online.'} showDuration={mode === 'endless'} empty="No results yet. Play casual typing while signed in to be first!" />
      <Link to={`/casual/play?length=${mode}`} onClick={close} className="self-start rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-contrast hover:opacity-90">
        Play casual typing
      </Link>
    </Overlay>
  )
}
