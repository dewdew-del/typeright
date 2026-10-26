import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../components/layout/Avatar'
import { countryName } from '../content/countries'
import { getPublicProfile, type ProfileStats, type RecentResult } from '../lib/api'

export function PublicProfile() {
  const { username = '' } = useParams()
  const [state, setState] = useState<{ stats: ProfileStats | null; recent: RecentResult[] } | null>(null)

  useEffect(() => {
    let live = true
    setState(null)
    void getPublicProfile(username).then((r) => live && setState(r))
    return () => {
      live = false
    }
  }, [username])

  if (state === null) return <main className="px-6 py-10 text-center text-muted">Loading…</main>
  if (!state.stats) {
    return (
      <main className="mx-auto max-w-[680px] px-6 py-14 text-center">
        <h1 className="text-3xl font-bold">Player not found</h1>
        <Link to="/leaderboard" className="mt-4 inline-block font-semibold text-accent">Back to the leaderboard</Link>
      </main>
    )
  }

  const s = state.stats
  const joined = new Date(s.joined_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })

  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 pb-16 pt-2">
      <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-surface p-6">
        <Avatar name={s.username} url={s.avatar_url} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold tracking-tight">
            {s.username}
            {s.is_guest && <span className="rounded-full border border-border bg-bg px-2.5 py-0.5 text-sm font-bold text-muted">Guest</span>}
          </h1>
          <p className="text-muted">{countryName(s.country)} · Joined {joined}</p>
        </div>
      </section>

      <section className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <Stat label="Best 30 s" value={s.best_30 !== null ? `${Math.round(s.best_30)} WPM` : '–'} accent />
        <Stat label="Best 60 s" value={s.best_60 !== null ? `${Math.round(s.best_60)} WPM` : '–'} />
        <Stat label="Tests taken" value={String(s.tests_taken)} />
        <Stat label="Average accuracy" value={s.avg_accuracy !== null ? `${Math.round(s.avg_accuracy)}%` : '–'} />
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="mb-1 text-lg font-bold">Badges</h2>
        <p className="text-sm text-muted">Badges and streaks arrive in the next update.</p>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="mb-3 text-lg font-bold">Recent ranked tests</h2>
        {state.recent.length === 0 ? (
          <p className="text-sm text-muted">No ranked tests yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {state.recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-muted">{new Date(r.created_at).toLocaleDateString()} · {r.duration_s} s</span>
                <span className="font-bold tabular-nums">{Math.round(r.wpm)} WPM <span className="font-medium text-muted">· {r.accuracy}%</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[22px] border border-border bg-surface px-5 py-4">
      <div className="text-sm font-semibold text-muted">{label}</div>
      <div className={['mt-1 text-2xl font-extrabold tracking-tight tabular-nums', accent ? 'text-accent' : ''].join(' ')}>{value}</div>
    </div>
  )
}
