import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BoardTable } from '../components/leaderboard/BoardTable'
import { Choice } from '../components/ui/Choice'
import { COUNTRIES } from '../content/countries'
import { getDailyBoard, getLeaderboard, myGroups, type BoardRow, type Group, type Period } from '../lib/api'
import { useAuth } from '../storage/authStore'

type Tab = 'global' | 'daily' | 'groups'

export function Leaderboard() {
  const [params, setParams] = useSearchParams()
  const tab = (['global', 'daily', 'groups'].includes(params.get('tab') ?? '') ? params.get('tab') : 'global') as Tab

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  const tabClass = (on: boolean) =>
    ['flex-1 rounded-[11px] px-4 py-2.5 text-[15px] font-bold sm:flex-none', on ? 'bg-surface text-text shadow-[0_1px_3px_rgba(15,23,42,0.12)]' : 'text-muted hover:text-text'].join(' ')

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-6 pb-16 pt-2">
      <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
      <div role="tablist" aria-label="Boards" className="flex gap-1 self-start rounded-[14px] bg-surface-2 p-1">
        <button type="button" role="tab" aria-selected={tab === 'global'} className={tabClass(tab === 'global')} onClick={() => update({ tab: null })}>Global</button>
        <button type="button" role="tab" aria-selected={tab === 'daily'} className={tabClass(tab === 'daily')} onClick={() => update({ tab: 'daily' })}>Daily challenge</button>
        <button type="button" role="tab" aria-selected={tab === 'groups'} className={tabClass(tab === 'groups')} onClick={() => update({ tab: 'groups' })}>My groups</button>
      </div>
      {tab === 'global' && <GlobalBoard params={params} update={update} />}
      {tab === 'daily' && <DailyBoard />}
      {tab === 'groups' && <GroupsTab />}
    </main>
  )
}

function GlobalBoard({ params, update }: { params: URLSearchParams; update: (p: Record<string, string | null>) => void }) {
  const duration: 30 | 60 = params.get('d') === '60' ? 60 : 30
  const period = (['all', 'weekly', 'daily'].includes(params.get('p') ?? '') ? params.get('p') : 'all') as Period
  const country = params.get('c')
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

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <Choice label="Test" value={String(duration)} onChange={(v) => update({ d: v })} options={[{ value: '30', label: '30 s' }, { value: '60', label: '60 s' }]} />
          <Choice<Period> label="Period" value={period} onChange={(v) => update({ p: v })} options={[{ value: 'all', label: 'All time' }, { value: 'weekly', label: 'This week' }, { value: 'daily', label: 'Today' }]} />
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
        <Link to={`/ranked?d=${duration}`} className="rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-contrast hover:opacity-90">Take a ranked {duration} s test</Link>
      </div>
      <BoardTable rows={rows} error={error} empty="No ranked results yet. Be the first!" />
      <p className="text-center text-sm text-muted">
        Only server-verified runs with at least 95% accuracy count. Today and this week use Philippine time. Guests appear on today and this week only.
      </p>
    </>
  )
}

function DailyBoard() {
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void getDailyBoard().then((r) => {
      setRows(r.rows)
      setError(r.error)
    })
  }, [])
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10)
  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-accent-soft p-6">
        <div>
          <div className="text-lg font-bold">Today's challenge</div>
          <div className="text-sm text-muted">Same 60-second text for everyone on {today}. It changes at midnight Philippine time.</div>
        </div>
        <Link to="/daily" className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast hover:opacity-90">Play today's challenge</Link>
      </section>
      <BoardTable rows={rows} error={error} empty="Nobody has played today yet." />
    </>
  )
}

function GroupsTab() {
  const user = useAuth((s) => s.user)
  const [groups, setGroups] = useState<Group[] | null>(null)
  useEffect(() => {
    if (user) void myGroups().then(setGroups)
    else setGroups([])
  }, [user])

  return (
    <section className="flex flex-col gap-3">
      {groups === null && <p className="text-muted">Loading…</p>}
      {groups?.length === 0 && (
        <p className="text-muted">You are not in any groups yet. Create one for your class, or join with a code.</p>
      )}
      {groups?.map((g) => (
        <Link key={g.id} to={`/groups/${g.id}`} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-4 font-bold hover:border-accent">
          {g.name}
          <span className="text-sm font-semibold text-accent">See board</span>
        </Link>
      ))}
      <Link to="/groups" className="self-start rounded-xl border border-border bg-surface px-5 py-2.5 font-bold hover:bg-surface-2">Create or join a group</Link>
    </section>
  )
}
