import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BoardTable } from '../components/leaderboard/BoardTable'
import { Choice } from '../components/ui/Choice'
import { COUNTRIES } from '../content/countries'
import { getCasualBoard, type BoardRow, type CasualMode, type Lang, type Period } from '../lib/api'

/** Leaderboard from casual typing: two categories, 2 min and Endless. */
export function Leaderboard() {
  const [params, setParams] = useSearchParams()
  const mode: CasualMode = params.get('m') === 'endless' ? 'endless' : '2min'
  const lang: Lang = params.get('l') === 'fil' ? 'fil' : 'en'
  const period = (['all', 'weekly', 'daily'].includes(params.get('p') ?? '') ? params.get('p') : 'all') as Period
  const country = params.get('c')
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setRows(null)
    void getCasualBoard(mode, lang, period, country).then((r) => {
      if (!live) return
      setRows(r.rows)
      setError(r.error)
    })
    return () => {
      live = false
    }
  }, [mode, lang, period, country])

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const tab = (on: boolean) =>
    ['flex-1 rounded-[11px] px-6 py-2.5 text-[15px] font-bold sm:flex-none', on ? 'bg-surface text-text shadow-[0_1px_3px_rgba(15,23,42,0.12)]' : 'text-muted hover:text-text'].join(' ')

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-6 pb-16 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <Link to="/casual" className="rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-contrast hover:opacity-90">Play casual typing</Link>
      </div>

      <div role="tablist" aria-label="Category" className="flex gap-1 self-start rounded-[14px] bg-surface-2 p-1">
        <button type="button" role="tab" aria-selected={mode === '2min'} className={tab(mode === '2min')} onClick={() => update({ m: null })}>2 min</button>
        <button type="button" role="tab" aria-selected={mode === 'endless'} className={tab(mode === 'endless')} onClick={() => update({ m: 'endless' })}>Endless</button>
      </div>

      <div className="flex flex-wrap gap-x-10 gap-y-5">
        <Choice<Lang> label="Language" value={lang} onChange={(v) => update({ l: v === 'en' ? null : v })} options={[{ value: 'en', label: 'English' }, { value: 'fil', label: 'Filipino' }]} />
        <Choice<Period> label="Period" value={period} onChange={(v) => update({ p: v === 'all' ? null : v })} options={[{ value: 'all', label: 'All time' }, { value: 'weekly', label: 'This week' }, { value: 'daily', label: 'Today' }]} />
        <label className="flex flex-col gap-3 text-sm font-bold">
          Country
          <select value={country ?? ''} onChange={(e) => update({ c: e.target.value || null })} className="rounded-full border border-border bg-surface px-4 py-2.5 text-[15px] font-semibold">
            <option value="">Everywhere</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      <BoardTable rows={rows} error={error} empty="No results yet. Play casual typing while signed in to be first!" />
      <p className="text-center text-sm text-muted">
        Server-verified casual runs with at least 95% accuracy. Endless runs need at least 1 minute of typing. Today and this week use Philippine time.
      </p>
    </main>
  )
}
