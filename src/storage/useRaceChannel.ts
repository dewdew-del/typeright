import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { acceptProgress } from '../lib/raceProgress'
import { supabase } from '../lib/supabase'

export interface LiveProgress {
  /** 0 to 1 of the text typed correctly. */
  pos: number
  wpm: number
}

/**
 * The race room's Realtime channel.
 * - Presence: who is in the room right now.
 * - Broadcast "progress": live progress bars (display only; results come from the server).
 * - Broadcast "refresh": tells everyone to reload the room (started, finished, new round).
 */
export function useRaceChannel(roomId: string, me: { id: string; username: string } | null, onRefresh: () => void) {
  const [online, setOnline] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<Record<string, LiveProgress>>({})
  const channel = useRef<RealtimeChannel | null>(null)
  const refresh = useRef(onRefresh)
  refresh.current = onRefresh
  const onlineNow = useRef(online)
  onlineNow.current = online

  const meId = me?.id
  const meName = me?.username
  useEffect(() => {
    if (!supabase || !meId) return
    const ch = supabase.channel(`race:${roomId}`, { config: { presence: { key: meId }, broadcast: { self: false } } })
    // The channel is public: several "refresh" messages close together count as one, so nobody can flood the room.
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    ch.on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(ch.presenceState()))))
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        const p = acceptProgress(payload, onlineNow.current, meId)
        if (p) setProgress((prev) => ({ ...prev, [p.id]: { pos: p.pos, wpm: p.wpm } }))
      })
      .on('broadcast', { event: 'refresh' }, () => {
        if (refreshTimer) return
        refreshTimer = setTimeout(() => {
          refreshTimer = undefined
          refresh.current()
        }, 300)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void ch.track({ username: meName })
      })
    channel.current = ch
    return () => {
      clearTimeout(refreshTimer)
      channel.current = null
      void supabase?.removeChannel(ch)
    }
  }, [roomId, meId, meName])

  const send = useCallback((event: 'progress' | 'refresh', payload: Record<string, unknown> = {}) => {
    void channel.current?.send({ type: 'broadcast', event, payload })
  }, [])

  const clearProgress = useCallback(() => setProgress({}), [])

  return { online, progress, send, clearProgress }
}
