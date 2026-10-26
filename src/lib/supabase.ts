import { createClient, type SupportedStorage } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/**
 * Where the login session is kept:
 * - accounts: localStorage, so you stay logged in between visits;
 * - anonymous guests: sessionStorage, so the guest session ends when the site is closed.
 */
const authStorage: SupportedStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k) ?? sessionStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    try {
      const anonymous = (JSON.parse(v) as { user?: { is_anonymous?: boolean } })?.user?.is_anonymous === true
      ;(anonymous ? sessionStorage : localStorage).setItem(k, v)
      ;(anonymous ? localStorage : sessionStorage).removeItem(k)
    } catch {
      /* storage blocked: the session lives in memory only */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  },
}

/** null when the app runs without Supabase configured (everything still works as a local guest). */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
      })
    : null
