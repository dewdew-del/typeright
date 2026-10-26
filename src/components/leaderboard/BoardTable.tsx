import { Link } from 'react-router-dom'
import { countryName } from '../../content/countries'
import type { BoardRow } from '../../lib/api'
import { useAuth } from '../../storage/authStore'
import { Avatar } from '../layout/Avatar'

/** Ranked rows: rank, player (links to profile), country, WPM, accuracy. Your row is highlighted. */
export function BoardTable({ rows, empty, error }: { rows: BoardRow[] | null; empty: string; error?: string | null }) {
  const me = useAuth((s) => s.user?.id)
  return (
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
            <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">{error ?? empty}</td></tr>
          )}
          {rows?.map((r) => (
            <tr key={r.user_id} className={['border-t border-border', r.user_id === me ? 'bg-accent-soft' : ''].join(' ')}>
              <td className="px-5 py-3.5">
                <span className={['grid h-8 w-8 place-items-center rounded-[10px] font-extrabold', r.rank === 1 ? 'bg-accent text-accent-contrast' : 'bg-bg text-muted'].join(' ')}>{r.rank}</span>
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
  )
}
