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
      <table className="w-full text-left sm:min-w-[560px]">
        <thead>
          <tr className="text-xs font-bold uppercase tracking-[0.04em] text-muted">
            <th scope="col" className="py-3.5 pl-4 pr-2 sm:px-5">#</th>
            <th scope="col" className="px-2 py-3.5">Player</th>
            <th scope="col" className="hidden px-2 py-3.5 sm:table-cell">Country</th>
            <th scope="col" className="px-2 py-3.5 text-right">WPM</th>
            <th scope="col" className="py-3.5 pl-2 pr-4 text-right sm:px-5">Accuracy</th>
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
              <td className="py-3.5 pl-4 pr-2 sm:px-5">
                <span className={['grid h-8 w-8 place-items-center rounded-[10px] font-extrabold', r.rank === 1 ? 'bg-accent text-accent-contrast' : 'bg-bg text-muted'].join(' ')}>{r.rank}</span>
              </td>
              <td className="px-2 py-3.5">
                <Link to={`/u/${encodeURIComponent(r.username)}`} className="flex min-w-0 items-center gap-2.5 break-all font-bold hover:text-accent">
                  <Avatar name={r.username} url={r.avatar_url} size={30} />
                  {r.username}
                  {r.is_guest && <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-xs font-bold text-muted">Guest</span>}
                </Link>
              </td>
              <td className="hidden px-2 py-3.5 text-sm text-muted sm:table-cell">{countryName(r.country)}</td>
              <td className="px-2 py-3.5 text-right text-lg font-extrabold tabular-nums">{Math.round(r.wpm)}</td>
              <td className="py-3.5 pl-2 pr-4 text-right tabular-nums sm:px-5">{r.accuracy}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
