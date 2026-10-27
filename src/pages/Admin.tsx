import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useActiveCount } from '../lib/presence'
import { useAuth } from '../storage/authStore'

interface SessionRow {
  username: string
  is_guest: boolean
  country: string
  last_seen: string
}

const HOURS = 24

function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  return `${h} h ${min % 60} min ago`
}

/** Developer-only page (not linked anywhere): who used the site recently. The database refuses everyone else. */
export function Admin() {
  const ready = useAuth((s) => s.ready)
  const signedIn = useAuth((s) => s.user !== null && !s.isAnonymous)
  const online = useActiveCount((s) => s.count)
  const [rows, setRows] = useState<SessionRow[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!supabase || !signedIn) return
    let live = true
    const load = async () => {
      const { data, error } = await supabase!.rpc('admin_recent_sessions', { p_hours: HOURS })
      if (!live) return
      if (error) setDenied(true)
      else {
        setDenied(false)
        setRows((data ?? []) as SessionRow[])
      }
    }
    void load()
    const id = window.setInterval(load, 30_000)
    return () => {
      live = false
      window.clearInterval(id)
    }
  }, [signedIn])

  if (!ready) return null
  if (!signedIn || denied) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-10 text-center">
        <p className="text-muted">This page is not available.</p>
        <Link to="/play" className="mt-3 inline-block font-bold text-accent">Back to the menu</Link>
      </main>
    )
  }

  const accounts = rows?.filter((r) => !r.is_guest).length ?? 0
  const guests = rows?.filter((r) => r.is_guest).length ?? 0
  const tile = 'flex-[1_1_150px] rounded-[18px] border border-border bg-surface px-5 py-3.5'

  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-5 px-6 pb-16 pt-2">
      <h1 className="text-2xl font-bold tracking-tight">Developer view</h1>
      <section className="flex flex-wrap gap-3">
        <div className={tile}><div className="text-[13px] font-semibold text-muted">Open tabs now</div><div className="mt-1 text-3xl font-extrabold tabular-nums">{online ?? '–'}</div></div>
        <div className={tile}><div className="text-[13px] font-semibold text-muted">Accounts, last {HOURS} h</div><div className="mt-1 text-3xl font-extrabold tabular-nums">{rows ? accounts : '–'}</div></div>
        <div className={tile}><div className="text-[13px] font-semibold text-muted">Guests, last {HOURS} h</div><div className="mt-1 text-3xl font-extrabold tabular-nums">{rows ? guests : '–'}</div></div>
      </section>

      <section aria-label="Recent sessions" className="overflow-x-auto rounded-3xl border border-border bg-surface">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-[0.04em] text-muted">
              <th scope="col" className="px-5 py-3.5">Name</th>
              <th scope="col" className="px-2 py-3.5">Type</th>
              <th scope="col" className="px-2 py-3.5">Country</th>
              <th scope="col" className="px-5 py-3.5 text-right">Last active</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-muted">No sessions in the last {HOURS} hours.</td></tr>}
            {rows?.map((r, i) => (
              <tr key={`${r.username}-${i}`} className="border-t border-border">
                <td className="px-5 py-3 font-bold">
                  <Link to={`/u/${encodeURIComponent(r.username)}`} className="hover:text-accent">{r.username}</Link>
                </td>
                <td className="px-2 py-3 text-sm">{r.is_guest ? 'Guest' : 'Account'}</td>
                <td className="px-2 py-3 text-sm text-muted">{r.country}</td>
                <td className="px-5 py-3 text-right text-sm tabular-nums" title={new Date(r.last_seen).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}>{ago(r.last_seen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-sm text-muted">
        Last active is when the login session was last refreshed, so it can lag a little. Open tabs now is the live counter and has no names.
      </p>
    </main>
  )
}
