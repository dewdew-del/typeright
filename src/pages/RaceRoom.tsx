import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/layout/Avatar'
import { NeedsPlayer } from '../components/race/NeedsPlayer'
import { TypingArea, type TypingResult } from '../components/typing/TypingArea'
import { joinRoom, leaveRoom, loadRoom, resetRoom, startRace, submitRace, touchStreak, type RaceRow, type Room, type RoomPlayer } from '../lib/api'
import { parseRoomLabel, raceText } from '../lib/raceText'
import { formatTime } from '../engine/stats'
import { MIN_RACE_ACCURACY, raceScore } from '../../supabase/functions/_shared/scoring'
import { useAuth } from '../storage/authStore'
import { useRaceChannel } from '../storage/useRaceChannel'

type Loaded = NonNullable<Awaited<ReturnType<typeof loadRoom>>>

export function RaceRoom() {
  const { roomId = '' } = useParams()
  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 pb-16 pt-2">
      <NeedsPlayer>
        <Room roomId={roomId} />
      </NeedsPlayer>
    </main>
  )
}

function Room({ roomId }: { roomId: string }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const me = user && profile ? { id: user.id, username: profile.username } : null
  const [data, setData] = useState<Loaded | null>(null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const d = await loadRoom(roomId)
    if (!d?.room) setMissing(true)
    else setData(d)
  }, [roomId])

  const { online, progress, send, clearProgress } = useRaceChannel(roomId, me, () => void refresh())

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Fallback polling in case a Realtime message is missed.
  const status = data?.room?.status
  useEffect(() => {
    const id = window.setInterval(() => void refresh(), status === 'racing' ? 2500 : 4000)
    return () => window.clearInterval(id)
  }, [refresh, status])

  if (missing) {
    return (
      <section className="text-center">
        <h1 className="text-3xl font-bold">Room not found</h1>
        <p className="mt-2 text-muted">It may have closed, or it is private and you are not in it.</p>
        <Link to="/friends/join" className="mt-4 inline-block font-semibold text-accent">Join another room</Link>
      </section>
    )
  }
  if (!data || !data.room || !me) return <p className="text-center text-muted">Loading the room…</p>

  const { room, players, results } = data
  const isMember = players.some((p) => p.user_id === me.id)
  const isHost = room.host_id === me.id
  const myResult = results.find((r) => r.user_id === me.id)

  if (!isMember) {
    return (
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold">Room {room.code}</h1>
        {room.status === 'lobby' ? (
          <button
            type="button"
            onClick={async () => {
              const { error: err } = await joinRoom(room.code)
              if (err) setError(err)
              else {
                send('refresh')
                void refresh()
              }
            }}
            className="rounded-xl bg-accent px-6 py-3 font-bold text-accent-contrast"
          >
            Join this room
          </button>
        ) : (
          <p className="text-muted">This race has already started.</p>
        )}
        {error && <p role="alert" className="font-semibold text-bad">{error}</p>}
      </section>
    )
  }

  const leave = async () => {
    await leaveRoom(room.id)
    send('refresh')
    navigate('/friends')
  }

  if (room.status === 'lobby') {
    return (
      <Lobby
        room={room}
        players={players}
        online={online}
        meId={me.id}
        isHost={isHost}
        error={error}
        onStart={async () => {
          setError(null)
          const err = await startRace(room.id)
          if (err) setError(err)
          else {
            clearProgress()
            send('refresh')
            void refresh()
          }
        }}
        onLeave={leave}
      />
    )
  }

  if (room.status === 'racing' && !myResult) {
    return (
      <Race
        key={`${room.id}-${room.starts_at}`}
        data={data}
        meId={me.id}
        progress={progress}
        onProgress={(pos, wpm) => send('progress', { id: me.id, pos, wpm })}
        onSubmitted={() => {
          send('refresh')
          void refresh()
        }}
        onLeave={leave}
      />
    )
  }

  return (
    <Results
      room={room}
      players={players}
      results={results}
      isHost={isHost}
      progress={progress}
      error={error}
      onAgain={async () => {
        setError(null)
        const { type, difficulty } = parseRoomLabel(room.text_type)
        const err = await resetRoom(room.id, await raceText(type, difficulty))
        if (err) setError(err)
        else {
          clearProgress()
          send('refresh')
          void refresh()
        }
      }}
      onLeave={leave}
    />
  )
}

function Lobby(props: {
  room: Room
  players: RoomPlayer[]
  online: Set<string>
  meId: string
  isHost: boolean
  error: string | null
  onStart: () => void
  onLeave: () => void
}) {
  const { room, players, online, meId, isHost } = props
  const [copied, setCopied] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Waiting room</h1>
        <button type="button" onClick={props.onLeave} className="rounded-full border border-border bg-surface px-[18px] py-[9px] text-sm font-bold hover:bg-surface-2">Leave</button>
      </div>
      <div className="flex flex-wrap items-start gap-5">
        <section className="flex flex-[1_1_320px] flex-col gap-5 rounded-[22px] border border-border bg-surface p-7">
          <div className="text-sm font-bold text-muted">Room code</div>
          <div className="flex gap-2" role="text" aria-label={`Room code ${room.code.split('').join(' ')}`}>
            {room.code.split('').map((c, i) => (
              <span key={i} className="grid h-[58px] min-w-12 place-items-center rounded-[14px] border-2 bg-bg text-[28px] font-extrabold text-accent" style={{ borderColor: 'color-mix(in srgb, var(--accent) 22%, var(--surface))' }}>
                {c}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(room.code).then(() => setCopied(true))
            }}
            className="flex items-center gap-2 self-start rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold hover:bg-surface-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
            {copied ? 'Copied!' : 'Copy code'}
          </button>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-accent">{room.text_type}</span>
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-accent">{room.visibility === 'public' ? 'Public room' : 'Private room'}</span>
          </div>
          <div className="flex flex-col items-start gap-3 border-t border-border pt-5">
            {isHost ? (
              <button type="button" onClick={props.onStart} disabled={players.length < 2} className="rounded-xl bg-accent px-10 py-[15px] text-lg font-bold text-accent-contrast hover:opacity-90 disabled:opacity-60">
                Start race
              </button>
            ) : (
              <span className="font-semibold text-muted">Waiting for the host to start…</span>
            )}
            {isHost && players.length < 2 && <span className="text-sm text-muted">Share the code: a race needs at least 2 players.</span>}
            {props.error && <span role="alert" className="text-sm font-semibold text-bad">{props.error}</span>}
          </div>
        </section>
        <section aria-label="Players" className="flex flex-[1.3_1_360px] flex-col gap-2.5 rounded-[22px] border border-border bg-surface px-6 py-5">
          <div className="flex items-baseline justify-between">
            <div className="font-bold">Players</div>
            <div className="text-sm text-muted">{players.length} of 8</div>
          </div>
          {players.map((p) => (
              <div key={p.user_id} className={['flex items-center gap-3 rounded-[14px] px-3 py-2.5', p.user_id === meId ? 'border border-accent bg-accent-soft' : 'border border-border bg-bg'].join(' ')}>
                <span className="relative">
                  <Avatar name={p.username} url={p.avatar_url} size={34} />
                  <span aria-hidden className={['absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface', online.has(p.user_id) ? 'bg-good' : 'bg-border'].join(' ')} />
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{p.username}{p.user_id === meId ? ' (you)' : ''}</span>
                {p.user_id === room.host_id && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-contrast">Host</span>}
                {p.is_guest && <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-bold text-muted">Guest</span>}
              </div>
          ))}
        </section>
      </div>
    </>
  )
}

function Lanes({ players, meId, progress, results, text }: { players: RoomPlayer[]; meId: string; progress: Record<string, { pos: number; wpm: number }>; results: RaceRow[]; text: string }) {
  return (
    <section aria-label="Race progress" className="flex flex-col gap-3.5 rounded-[22px] border border-border bg-surface px-[22px] py-[18px]">
      {players.map((p) => {
        const done = results.find((r) => r.user_id === p.user_id)
        const live = progress[p.user_id]
        const pos = done ? Math.min(1, done.progress / text.length) : (live?.pos ?? 0)
        const wpm = done ? done.wpm : (live?.wpm ?? 0)
        const pct = Math.round(pos * 100)
        const mine = p.user_id === meId
        return (
          <div key={p.user_id} className="flex items-center gap-3.5">
            <span className="w-[110px] shrink-0 truncate text-sm font-semibold">{mine ? 'You' : p.username}</span>
            <div role="progressbar" aria-label={`${p.username} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="relative h-3.5 flex-1 rounded-full border border-border bg-bg">
              <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: `color-mix(in srgb, var(--accent) ${mine ? 100 : 45}%, var(--surface))` }} />
              <div className="absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] shadow transition-[left] duration-300" style={{ left: `${pct}%`, background: mine ? 'var(--accent)' : 'var(--surface)', borderColor: mine ? 'var(--surface)' : 'var(--accent)' }} />
            </div>
            <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums">{Math.round(wpm)} <span className="text-xs font-medium text-muted">WPM</span></span>
          </div>
        )
      })}
    </section>
  )
}

function Race(props: {
  data: Loaded
  meId: string
  progress: Record<string, { pos: number; wpm: number }>
  onProgress: (pos: number, wpm: number) => void
  onSubmitted: () => void
  onLeave: () => void
}) {
  const { players, results, clockOffset } = props.data
  const room = props.data.room!
  const startsAt = Date.parse(room.starts_at!)
  const capMs = room.cap_s * 1000
  const serverNow = () => Date.now() + clockOffset
  const [now, setNow] = useState(serverNow)
  const [finishSignal, setFinishSignal] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [mine, setMine] = useState({ pos: 0, wpm: 0 })
  const lastSent = useRef(0)

  // Clock for the countdown and the time cap.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now() + clockOffset
      setNow(t)
      if (t >= startsAt + capMs) setFinishSignal((n) => (n === 0 ? 1 : n))
    }, 100)
    return () => window.clearInterval(id)
  }, [clockOffset, startsAt, capMs])

  const started = now >= startsAt
  const countdown = Math.ceil((startsAt - now) / 1000)
  const { onProgress, onSubmitted } = props

  const handleProgress = useCallback(
    (correct: number, wpm: number) => {
      const pos = correct / room.text.length
      setMine({ pos, wpm })
      const t = Date.now()
      if (t - lastSent.current > 250 || pos >= 1) {
        lastSent.current = t
        onProgress(pos, wpm)
      }
    },
    [room.text.length, onProgress],
  )

  const onFinish = useCallback(
    async (r: TypingResult) => {
      if (r.log.length === 0) return // never typed: nothing to submit
      const { error } = await submitRace(room.id, r.log)
      if (error) setSubmitError(error)
      void touchStreak()
      onSubmitted()
    },
    [room.id, onSubmitted],
  )

  const progress = useMemo(() => ({ ...props.progress, [props.meId]: mine }), [props.progress, props.meId, mine])
  const elapsed = Math.max(0, now - startsAt)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Race</h1>
        <div className="flex gap-2.5">
          <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold tabular-nums">{started ? formatTime(elapsed) : 'Get ready'}</span>
          <button type="button" onClick={props.onLeave} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold hover:bg-surface-2">Leave</button>
        </div>
      </div>
      <Lanes players={players} meId={props.meId} progress={progress} results={results} text={room.text} />
      <div className="relative">
        <TypingArea target={room.text} locked={!started} finishSignal={finishSignal} onProgress={handleProgress} onFinish={onFinish} />
        {!started && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-live="assertive">
            <span className="rounded-3xl bg-accent px-10 py-6 text-6xl font-extrabold text-accent-contrast shadow-xl tabular-nums">{countdown > 0 ? countdown : 'Go!'}</span>
          </div>
        )}
      </div>
      {submitError && <p role="alert" className="text-center font-semibold text-bad">{submitError}</p>}
      <p className="text-center text-sm text-muted">Pasting is disabled, and your result is checked by the server. Max {formatTime(capMs)}.</p>
    </>
  )
}

function Results(props: {
  room: Room
  players: RoomPlayer[]
  results: RaceRow[]
  isHost: boolean
  progress: Record<string, { pos: number; wpm: number }>
  error: string | null
  onAgain: () => void
  onLeave: () => void
}) {
  const { room, players, results, isHost } = props
  const byId = new Map(players.map((p) => [p.user_id, p]))
  // Ranked by overall score (speed x accuracy), not by who finished first; finish time only breaks ties.
  const ranked = [...results].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1
    if (a.finished) return raceScore(b.wpm, b.accuracy) - raceScore(a.wpm, a.accuracy) || (a.finish_ms ?? 0) - (b.finish_ms ?? 0)
    return b.progress - a.progress
  })
  const waiting = players.filter((p) => !results.some((r) => r.user_id === p.user_id))
  const capPassed = room.starts_at ? Date.now() > Date.parse(room.starts_at) + room.cap_s * 1000 + 5000 : true
  const over = room.status === 'done' || waiting.length === 0 || capPassed

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{over ? 'Results' : 'Waiting for others…'}</h1>
        <span className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5L15.5 10" /></svg>
          Verified by the server
        </span>
      </div>
      <section aria-label="Final standings" className="flex flex-col gap-2.5">
        {ranked.map((r, i) => {
          const p = byId.get(r.user_id)
          return (
            <div key={r.user_id} className="flex flex-wrap items-center gap-3.5 rounded-[18px] border border-border bg-surface px-5 py-4">
              <span className={['grid h-[34px] w-[34px] place-items-center rounded-[10px] font-extrabold', i === 0 && r.finished ? 'bg-accent text-accent-contrast' : 'bg-bg text-muted'].join(' ')}>{i + 1}</span>
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar name={p?.username ?? '?'} url={p?.avatar_url} size={32} />
                <span className="truncate font-bold">{p?.username ?? 'Left the room'}</span>
                {p?.is_guest && <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-xs font-bold text-muted">Guest</span>}
              </span>
              <span className="w-24 text-right text-xl font-extrabold tabular-nums" title="Score: speed x accuracy">{r.finished ? raceScore(r.wpm, r.accuracy) : '-'} <span className="text-xs font-medium text-muted">pts</span></span>
              <span className="w-16 text-right text-sm font-semibold tabular-nums">{Math.round(r.wpm)} <span className="text-xs font-medium text-muted">WPM</span></span>
              <span className="w-14 text-right text-sm font-semibold tabular-nums">{r.accuracy}%</span>
              <span className="w-16 text-right text-sm text-muted tabular-nums">{r.finished ? formatTime(r.finish_ms ?? 0) : r.accuracy < MIN_RACE_ACCURACY ? 'Under ' + MIN_RACE_ACCURACY + '%' : 'DNF'}</span>
            </div>
          )
        })}
        {!over &&
          waiting.map((p) => (
            <div key={p.user_id} className="flex items-center gap-3.5 rounded-[18px] border border-dashed border-border px-5 py-4 text-muted">
              <Avatar name={p.username} url={p.avatar_url} size={32} />
              <span className="flex-1 font-semibold">{p.username}</span>
              <span className="text-sm">Still racing… {Math.round((props.progress[p.user_id]?.pos ?? 0) * 100)}%</span>
            </div>
          ))}
      </section>
      <p className="text-sm text-muted">
        Ranked by score: speed (WPM) times accuracy. Finish with at least {MIN_RACE_ACCURACY}% accuracy to be counted; typing fast but wrong does not win.
      </p>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {isHost ? (
          <button type="button" onClick={props.onAgain} disabled={!over} className="rounded-xl bg-accent px-8 py-3.5 text-[17px] font-bold text-accent-contrast hover:opacity-90 disabled:opacity-60">
            Race again
          </button>
        ) : (
          over && <span className="font-semibold text-muted">The host can start another round.</span>
        )}
        <button type="button" onClick={props.onLeave} className="rounded-xl border border-border bg-surface px-7 py-3.5 text-[17px] font-bold hover:bg-surface-2">Back to menu</button>
        {props.error && <span role="alert" className="text-sm font-semibold text-bad">{props.error}</span>}
      </div>
    </>
  )
}
