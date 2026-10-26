import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/layout/Avatar'
import { BoardTable } from '../components/leaderboard/BoardTable'
import { NeedsPlayer } from '../components/race/NeedsPlayer'
import { Choice } from '../components/ui/Choice'
import { createGroup, getGroup, getGroupBoard, joinGroup, leaveGroup, myGroups, type BoardRow, type Group } from '../lib/api'
import { useAuth } from '../storage/authStore'

const input = 'min-w-0 flex-1 rounded-xl border border-border bg-bg px-3.5 py-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent'

/** Groups: a class or friend group with its own leaderboard, joined with a 6-character code. */
export function Groups() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const user = useAuth((s) => s.user)

  useEffect(() => {
    if (user) void myGroups().then(setGroups)
  }, [user])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const { id, error: err } = await createGroup(name)
    if (id) navigate(`/groups/${id}`)
    else setError(err)
  }
  const join = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const { id, error: err } = await joinGroup(code)
    if (id) navigate(`/groups/${id}`)
    else setError(err)
  }

  return (
    <main className="mx-auto flex max-w-[680px] flex-col gap-6 px-6 pb-16 pt-2">
      <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
      <NeedsPlayer>
        {groups && groups.length > 0 && (
          <section className="flex flex-col gap-2.5">
            {groups.map((g) => (
              <Link key={g.id} to={`/groups/${g.id}`} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-4 font-bold hover:border-accent">
                {g.name}
                <span className="font-mono text-sm text-muted">{g.join_code}</span>
              </Link>
            ))}
          </section>
        )}
        <form onSubmit={create} className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6">
          <label htmlFor="group-name" className="font-bold">Create a group</label>
          <div className="flex gap-2.5">
            <input id="group-name" className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BSCS 3-A" minLength={2} maxLength={40} required />
            <button type="submit" className="rounded-xl bg-accent px-5 font-bold text-accent-contrast">Create</button>
          </div>
        </form>
        <form onSubmit={join} className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6">
          <label htmlFor="group-code" className="font-bold">Join with a code</label>
          <div className="flex gap-2.5">
            <input id="group-code" className={`${input} font-bold uppercase tracking-[0.2em]`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="ABC234" required />
            <button type="submit" className="rounded-xl border border-border bg-bg px-5 font-bold hover:bg-surface-2">Join</button>
          </div>
        </form>
        {error && <p role="alert" className="font-semibold text-bad">{error}</p>}
      </NeedsPlayer>
    </main>
  )
}

export function GroupDetail() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const userId = useAuth((s) => s.user?.id)
  const [state, setState] = useState<Awaited<ReturnType<typeof getGroup>> | null>(null)
  const [duration, setDuration] = useState<'30' | '60'>('30')
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void getGroup(groupId).then(setState)
  }, [groupId, userId])
  useEffect(() => {
    setRows(null)
    void getGroupBoard(groupId, duration === '60' ? 60 : 30).then((r) => setRows(r.rows))
  }, [groupId, duration])

  if (state === null) return <main className="px-6 py-10 text-center text-muted">Loading…</main>
  if (!state.group) {
    return (
      <main className="mx-auto max-w-[680px] px-6 py-14 text-center">
        <h1 className="text-3xl font-bold">Group not found</h1>
        <p className="mt-2 text-muted">You can only see groups you are in.</p>
        <Link to="/groups" className="mt-4 inline-block font-semibold text-accent">Back to groups</Link>
      </main>
    )
  }
  const g = state.group

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-6 pb-16 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{g.name}</h1>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(g.join_code).then(() => setCopied(true))}
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold hover:bg-surface-2"
        >
          Join code: <span className="font-mono tracking-[0.15em] text-accent">{g.join_code}</span> {copied ? '(copied)' : ''}
        </button>
      </div>
      <Choice label="Test" value={duration} onChange={setDuration} options={[{ value: '30', label: '30 s' }, { value: '60', label: '60 s' }]} />
      <BoardTable rows={rows} empty="No ranked results in this group yet. Take a ranked test to get on the board." />
      <section className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="mb-3 font-bold">Members ({state.members.length})</h2>
        <div className="flex flex-wrap gap-2.5">
          {state.members.map((m) => (
            <Link key={m.user_id} to={`/u/${encodeURIComponent(m.username)}`} className="flex items-center gap-2 rounded-full border border-border bg-bg py-1 pl-1 pr-3.5 text-sm font-semibold hover:border-accent">
              <Avatar name={m.username} url={m.avatar_url} size={26} />
              {m.username}
            </Link>
          ))}
        </div>
      </section>
      {userId && (
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(`Leave ${g.name}?`)) return
            await leaveGroup(g.id, userId)
            navigate('/groups')
          }}
          className="self-start rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-bold text-bad hover:bg-surface-2"
        >
          Leave group
        </button>
      )}
    </main>
  )
}
