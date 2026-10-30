import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NeedsPlayer, PlayingAs } from '../components/race/NeedsPlayer'
import { createRoom, joinRoom, listPublicRooms } from '../lib/api'
import { Choice } from '../components/ui/Choice'
import { NeedsInternet } from '../components/ui/NeedsInternet'
import { useOnline } from '../lib/online'
import { DIFFICULTIES, RACE_TEXT_TYPES, raceText, roomLabel, type Difficulty, type RaceTextType } from '../lib/raceText'
import { useAuth } from '../storage/authStore'

function BackHeader({ title, to = '/friends' }: { title: string; to?: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    </div>
  )
}

function PictureButton({ to, title, art }: { to: string; title: string; art: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface transition duration-150 hover:-translate-y-1 hover:border-accent hover:shadow-[0_12px_28px_rgba(15,23,42,0.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {art}
      <div className="px-6 py-[22px] text-center text-[22px] font-bold tracking-tight">{title}</div>
    </Link>
  )
}

/** Play with friends: two big choices, as in the design. */
export function Friends() {
  const online = useOnline()
  if (!online) return <main className="px-6 pb-16 pt-6"><NeedsInternet what="Playing with friends" /></main>
  return (
    <main className="mx-auto max-w-[880px] px-6 pb-16 pt-6">
      <h1 className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">Play with friends</h1>
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <PictureButton
          to="/friends/create"
          title="Create a room"
          art={
            <svg viewBox="0 0 320 210" role="img" aria-label="A room with three players and a plus button" className="block h-auto w-full bg-art-bg">
              <rect className="art-fs art-s3" x="50" y="36" width="220" height="138" rx="22" strokeWidth="2" />
              {[100, 160, 220].map((x, i) => (
                <g key={x}>
                  <circle className={['art-t3', 'art-t2', 'art-t1'][i]} cx={x} cy="92" r="20" />
                  <circle cx={x} cy="86" r="6" fill={i === 2 ? 'var(--accent-contrast)' : 'var(--surface)'} />
                  <path d={`M${x - 11} 102c1.5-6 5-8.5 11-8.5s9.5 2.5 11 8.5z`} fill={i === 2 ? 'var(--accent-contrast)' : 'var(--surface)'} />
                </g>
              ))}
              <rect className="art-t4" x="80" y="132" width="160" height="12" rx="6" />
              <circle className="art-t1" cx="248" cy="158" r="22" stroke="var(--surface)" strokeWidth="5" />
              <path d="M248 148v20M238 158h20" stroke="var(--accent-contrast)" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          }
        />
        <PictureButton
          to="/friends/join"
          title="Join a room"
          art={
            <svg viewBox="0 0 320 210" role="img" aria-label="A room code being entered" className="block h-auto w-full bg-art-bg">
              <g fontSize="22" fontWeight="800" textAnchor="middle">
                {['K', '7', 'Q', 'X'].map((c, i) => (
                  <g key={c}>
                    <rect className="art-fs art-s3" x={40 + i * 48} y="62" width="40" height="52" rx="12" strokeWidth="2.5" />
                    <text x={60 + i * 48} y="97" fill="var(--accent)">{c}</text>
                  </g>
                ))}
                <rect className="art-t4 art-s1" x="232" y="62" width="40" height="52" rx="12" strokeWidth="2.5" strokeDasharray="5 5" />
              </g>
              <rect className="art-t1" x="40" y="140" width="232" height="36" rx="18" />
              <path d="M138 158h36M164 150l10 8-10 8" fill="none" stroke="var(--accent-contrast)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>
    </main>
  )
}

export function CreateRoom() {
  const online = useOnline()
  const navigate = useNavigate()
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [type, setType] = useState<RaceTextType>('Sentences')
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    setBusy(true)
    setError(null)
    const { id, error: err } = await createRoom(visibility, roomLabel(type, difficulty), await raceText(type, difficulty))
    setBusy(false)
    if (id) navigate(`/race/${id}`)
    else setError(err)
  }

  if (!online) return <main className="px-6 pb-16 pt-2"><NeedsInternet what="Creating a room" /></main>

  const card = (v: 'private' | 'public', label: string, note: string, icon: ReactNode) => {
    const on = visibility === v
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setVisibility(v)}
        className={['flex flex-col items-start gap-1.5 rounded-[18px] p-[18px] text-left', on ? 'border-2 border-accent bg-accent-soft p-[17px]' : 'border border-border bg-surface'].join(' ')}
      >
        <span className={['mb-1 grid h-10 w-10 place-items-center rounded-xl', on ? 'bg-accent text-accent-contrast' : 'bg-accent-soft text-accent'].join(' ')}>{icon}</span>
        <span className="text-[17px] font-bold">{label}</span>
        <span className="text-[13px] leading-snug text-muted">{note}</span>
      </button>
    )
  }

  return (
    <main className="mx-auto flex max-w-[680px] flex-col gap-7 px-6 pb-16 pt-2">
      <BackHeader title="Create a room" />
      <NeedsPlayer>
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {card('private', 'Private', 'Only people with your code can join.', <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>)}
            {card('public', 'Public', 'Anyone can find it in the list and join.', <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>)}
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <label htmlFor="text-type" className="text-[15px] font-bold">What do you want to type?</label>
          <select
            id="text-type"
            value={type}
            onChange={(e) => setType(e.target.value as RaceTextType)}
            className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-[16px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {RACE_TEXT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </section>
        <section className="flex flex-col gap-3">
          <Choice label="Difficulty" value={difficulty} onChange={setDifficulty} options={DIFFICULTIES.map((d) => ({ value: d, label: d }))} />
          <p className="text-sm text-muted">Easy: short, simple texts. Medium: everyday texts. Hard: long, tricky texts.</p>
        </section>
        <section className="flex flex-col gap-3.5 pt-1">
          <button type="button" onClick={create} disabled={busy} className="rounded-2xl bg-accent py-4 text-lg font-bold text-accent-contrast hover:opacity-90 disabled:opacity-60">
            {busy ? 'Creating…' : 'Create room'}
          </button>
          {error && <p role="alert" className="text-center text-sm font-semibold text-bad">{error}</p>}
          <PlayingAs />
        </section>
      </NeedsPlayer>
    </main>
  )
}

export function JoinRoom() {
  const online = useOnline()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Awaited<ReturnType<typeof listPublicRooms>> | null>(null)
  const signedIn = useAuth((s) => s.user !== null)

  useEffect(() => {
    if (!signedIn) return
    let live = true
    const load = () => void listPublicRooms().then((r) => live && setRooms(r))
    load()
    const id = window.setInterval(load, 5000)
    return () => {
      live = false
      window.clearInterval(id)
    }
  }, [signedIn])

  const join = async (c: string) => {
    setError(null)
    const { id, error: err } = await joinRoom(c)
    if (id) navigate(`/race/${id}`)
    else setError(err)
  }

  if (!online) return <main className="px-6 pb-16 pt-2"><NeedsInternet what="Joining a room" /></main>

  return (
    <main className="mx-auto flex max-w-[680px] flex-col gap-7 px-6 pb-16 pt-2">
      <BackHeader title="Join a room" />
      <NeedsPlayer>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void join(code)
          }}
          className="flex flex-col gap-3.5 rounded-[22px] border border-border bg-surface p-6"
        >
          <label htmlFor="room-code" className="text-[15px] font-bold">Enter the room code</label>
          <div className="flex flex-wrap gap-3">
            <input
              id="room-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
              placeholder="K7QX2"
              autoComplete="off"
              className="min-w-0 flex-[1_1_220px] rounded-2xl border-2 border-border bg-bg px-4 py-3.5 text-center text-[26px] font-extrabold uppercase tracking-[0.3em] outline-none focus-visible:border-accent"
            />
            <button type="submit" disabled={code.length !== 5} className="rounded-2xl bg-accent px-9 py-4 text-lg font-bold text-accent-contrast disabled:opacity-60">Join</button>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-bad">{error}</p>}
        </form>

        <section className="flex flex-col gap-3">
          {rooms?.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-border bg-surface px-[18px] py-3.5">
              <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">{r.host.charAt(0).toUpperCase()}</span>
              <span className="min-w-0 flex-[1_1_160px]">
                <span className="block font-bold">{r.host}'s room</span>
                <span className="block text-[13px] text-muted">{r.text_type}</span>
              </span>
              <span className="text-sm font-semibold text-muted">{r.players} of 8 players</span>
              <button type="button" onClick={() => void join(r.code)} className="rounded-xl border border-border bg-bg px-5 py-2 font-bold hover:bg-surface-2">Join</button>
            </div>
          ))}
        </section>
        <PlayingAs />
      </NeedsPlayer>
    </main>
  )
}
