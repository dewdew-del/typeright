import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/layout/Avatar'
import { Choice } from '../components/ui/Choice'
import { COUNTRIES, countryName } from '../content/countries'
import { getLeaderboard, type BoardRow, type Period } from '../lib/api'
import { useAuth } from '../storage/authStore'

export function Leaderboard() {
  const [params, setParams] = useSearchParams()
  const duration: 30 | 60 = params.get('d') === '60' ? 60 : 30
  const period = (['all', 'weekly', 'daily'].includes(params.get('p') ?? '') ? params.get('p') : 'all') as Period
  const country = params.get('c')
  const me = useAuth((s) => s.user?.id)
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setRows(null)
    void getLeaderboard(duration, period, country).then((r) => {
      if (!live) return
      setRows(r.rows)
      setError(r.error)
    })
    return () => {
      live = false
    }
  }, [duration, period, country])

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-6 pb-16 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <Link to={`/ranked?d=${duration}`} className="rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-contrast hover:opacity-90">
          Take a ranked {duration} s test
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-10 gap-y-5">
        <Choice label="Test" value={String(duration)} onChange={(v) => update({ d: v })} options={[{ value: '30', label: '30 s' }, { value: '60', label: '60 s' }]} />
        <Choice<Period>
          label="Period"
          value={period}
          onChange={(v) => update({ p: v })}
          options={[{ value: 'all', label: 'All time' }, { value: 'weekly', label: 'This week' }, { value: 'daily', label: 'Today' }]}
        />
        <label className="flex flex-col gap-3 text-sm font-bold">
          Country
          <select
            value={country ?? ''}
            onChange={(e) => update({ c: e.target.value || null })}
            className="rounded-full border border-border bg-surface px-4 py-2.5 text-[15px] font-semibold"
          >
            <option value="">Everywhere</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      <section aria-label="Rankings" className="overflow-x-auto rounded-3xl border border-border bg-surface">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-[0.04em] text-muted">
              <th scope="col" className="px-5 py-3.5">#</th>
              <th scope="col" className="px-2 py-3.5">Player</th>
              <th scope="col" className="px-2 py-3.5">Country</th>
              <th scope="col" className="px-2 py-3.5 text-right">WPM</th>
              <th scope="col" className="px-5 py-3.5 text-right">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Loading…</td></tr>
            )}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted">
                  {error ?? 'No ranked results yet. Be the first!'}
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.user_id} className={['border-t border-border', r.user_id === me ? 'bg-accent-soft' : ''].join(' ')}>
                <td className="px-5 py-3.5">
                  <span className={['grid h-8 w-8 place-items-center rounded-[10px] font-extrabold', r.rank === 1 ? 'bg-accent text-accent-contrast' : 'bg-bg text-muted'].join(' ')}>
                    {r.rank}
                  </span>
                </td>
                <td className="px-2 py-3.5">
                  <Link to={`/u/${encodeURIComponent(r.username)}`} className="flex items-center gap-2.5 font-bold hover:text-accent">
                    <Avatar name={r.username} url={r.avatar_url} size={30} />
                    {r.username}
                    {r.is_guest && <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-xs font-bold text-muted">Guest</span>}
                  </Link>
                </td>
                <td className="px-2 py-3.5 text-sm text-muted">{countryName(r.country)}</td>
                <td className="px-2 py-3.5 text-right text-lg font-extrabold tabular-nums">{Math.round(r.wpm)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums">{r.accuracy}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-center text-sm text-muted">
        Only server-verified runs with at least 95% accuracy count. Today and this week use Philippine time.
      </p>
    </main>
  )
}
