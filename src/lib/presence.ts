import { useEffect } from 'react'
import { create } from 'zustand'
import { supabase } from './supabase'

/** How many people have TypeRight open right now. Nobody is identified: each tab uses a random, throwaway id. */
export const useActiveCount = create<{ count: number | null }>()(() => ({ count: null }))

/** Joins the shared "visitors" Realtime channel while the app is open. Mount once at the root. */
export function usePresence() {
  useEffect(() => {
    if (!supabase) return
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Math.random())
    const channel = supabase.channel('site:visitors', { config: { presence: { key: id } } })
    channel
      .on('presence', { event: 'sync' }, () => useActiveCount.setState({ count: Object.keys(channel.presenceState()).length }))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ at: Date.now() })
      })
    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [])
}
