import { useCallback, useEffect, useRef, useState } from 'react'
import type { TypingMode } from '../../supabase/functions/_shared/scoring'
import { checkTime, createSession, endSession, extendTarget, isEnded, pressKey, sessionStats, type TypingSession } from './session'

/**
 * React wrapper around a TypingSession. The session is mutated in place (cheap per keystroke);
 * `version` bumps on every change so components re-render.
 */
export function useTypingSession(target: string, mode: TypingMode, timeLimitMs?: number) {
  const sessionRef = useRef<TypingSession>(createSession(target, mode, timeLimitMs))
  const [, setVersion] = useState(0)
  const [now, setNow] = useState(() => performance.now())
  const bump = useCallback(() => {
    setNow(performance.now())
    setVersion((v) => v + 1)
  }, [])

  const reset = useCallback(() => {
    sessionRef.current = createSession(target, mode, timeLimitMs)
    bump()
  }, [target, mode, timeLimitMs, bump])

  // A new text or rule set starts a fresh session.
  useEffect(() => {
    reset()
  }, [reset])

  const session = sessionRef.current
  const running = session.startedAt !== null && !isEnded(session)

  // Tick while running so the clock and WPM update between keystrokes, and timed tests end on time.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      checkTime(sessionRef.current, performance.now())
      bump()
    }, 200)
    return () => window.clearInterval(id)
  }, [running, bump])

  const onKey = useCallback(
    (key: string) => {
      if (pressKey(sessionRef.current, key, performance.now())) bump()
    },
    [bump],
  )

  const extend = useCallback((more: string) => {
    extendTarget(sessionRef.current, more)
    setVersion((v) => v + 1)
  }, [])

  const finish = useCallback(() => {
    if (endSession(sessionRef.current, performance.now())) bump()
  }, [bump])

  return { session, stats: sessionStats(session, now), ended: isEnded(session), onKey, reset, extend, finish, now }
}
