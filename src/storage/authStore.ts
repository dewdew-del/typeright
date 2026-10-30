import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { emptyProgress } from '../engine/progress'
import { captchaToken } from '../lib/captcha'
import { IS_DESKTOP } from '../lib/platform'
import { supabase } from '../lib/supabase'
import { useProgress } from './progressStore'

export interface Profile {
  id: string
  username: string
  country: string
  avatar_url: string | null
  is_guest: boolean
  tested_out_stages: number[]
}

interface AuthState {
  ready: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  /** True for an anonymous guest session (races and the daily challenge as a guest). */
  isAnonymous: boolean
  init: () => void
  reloadProfile: () => Promise<void>
}

export const useAuth = create<AuthState>()((set, get) => ({
  ready: false,
  session: null,
  user: null,
  profile: null,
  isAnonymous: false,

  init: () => {
    if (!supabase) {
      set({ ready: true })
      return
    }
    const apply = async (session: Session | null) => {
      const user = session?.user ?? null
      set({ session, user, isAnonymous: user?.is_anonymous === true, ready: true })
      if (user) await get().reloadProfile()
      else set({ profile: null })
    }
    void supabase.auth.getSession().then(({ data }) => apply(data.session))
    supabase.auth.onAuthStateChange((_event, session) => {
      // Defer: Supabase recommends not awaiting other calls inside this callback.
      setTimeout(() => void apply(session), 0)
    })
  },

  reloadProfile: async () => {
    const user = get().user
    if (!supabase || !user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    set({ profile: (data as Profile | null) ?? null })
  },
}))

export const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/

const redirect = (path: string) => `${window.location.origin}${path}`

/** Auth actions. Each returns an error message for the UI, or null on success. */
export const auth = {
  async signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Accounts are not set up yet.'
    const captcha = await robotCheck()
    if (captcha.error) return captcha.error
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captcha.token } })
    return error ? friendly(error.message) : null
  },

  /** Google sign-in. For a guest, links Google to the guest account instead (same id). */
  async google(): Promise<string | null> {
    if (!supabase) return 'Accounts are not set up yet.'
    // Ask Supabase first: if Google is switched off, the redirect would land on a raw JSON error page.
    try {
      const url = import.meta.env.VITE_SUPABASE_URL as string
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
      const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      const settings = (await res.json()) as { external?: { google?: boolean } }
      if (settings.external?.google === false) return 'Google login is not switched on yet. Use email for now.'
    } catch {
      /* can't tell: try the redirect anyway */
    }
    const options = { redirectTo: redirect('/play') }
    const { error } = useAuth.getState().isAnonymous
      ? await supabase.auth.linkIdentity({ provider: 'google', options })
      : await supabase.auth.signInWithOAuth({ provider: 'google', options })
    return error ? friendly(error.message) : null
  },

  /** Anonymous guest session, needed for races and the daily challenge (Stage 7). */
  async ensureGuest(): Promise<string | null> {
    if (!supabase) return 'Online play is not set up yet.'
    if (useAuth.getState().user) return null
    const captcha = await robotCheck()
    if (captcha.error) return captcha.error
    const { error } = await supabase.auth.signInAnonymously({ options: { captchaToken: captcha.token } })
    return error ? friendly(error.message) : null
  },

  async resetPassword(email: string): Promise<string | null> {
    if (!supabase) return 'Accounts are not set up yet.'
    const captcha = await robotCheck()
    if (captcha.error) return captcha.error
    // The desktop app can't open email links, so those go to the website (Supabase's Site URL).
    const redirectTo = IS_DESKTOP ? undefined : redirect('/profile?set-password=1')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo, captchaToken: captcha.token })
    return error ? friendly(error.message) : null
  },

  async setPassword(password: string): Promise<string | null> {
    if (!supabase) return 'Accounts are not set up yet.'
    const { error } = await supabase.auth.updateUser({ password })
    return error ? friendly(error.message) : null
  },

  async updateProfile(patch: Partial<Pick<Profile, 'username' | 'country' | 'avatar_url'>>): Promise<string | null> {
    const user = useAuth.getState().user
    if (!supabase || !user) return 'You are not signed in.'
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    if (error) {
      if (error.code === '23505') return 'That username is taken.'
      if (error.code === '23514') return 'That name is not allowed. Try another one.'
      return friendly(error.message)
    }
    await useAuth.getState().reloadProfile()
    return null
  },

  /** New profile photo: center-cropped to 256x256 WebP in the browser, then stored in the user's own folder. */
  async uploadAvatar(file: File): Promise<string | null> {
    const user = useAuth.getState().user
    if (!supabase || !user) return 'You are not signed in.'
    if (!file.type.startsWith('image/')) return 'Please choose an image file.'
    let blob: Blob
    try {
      blob = await squareWebp(file, 256)
    } catch {
      return 'Could not read that image. Try a JPG or PNG.'
    }
    const path = `${user.id}/avatar.webp`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/webp' })
    if (error) return 'Upload failed. Please try again.'
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    // A changing query string makes browsers show the new photo instead of a cached one.
    return auth.updateProfile({ avatar_url: `${data.publicUrl}?v=${Date.now()}` })
  },

  async signOut() {
    // Offline, a global sign-out cannot reach the server and would leave the session in place.
    await supabase?.auth.signOut({ scope: navigator.onLine ? 'global' : 'local' })
    // The progress on this device belongs to the account that just left.
    useProgress.getState().replace(emptyProgress(), null)
  },
}

async function squareWebp(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/webp', 0.85))
}

/** Turnstile token when the human check is set up; an error message if it couldn't run. */
async function robotCheck(): Promise<{ token?: string; error?: string }> {
  try {
    return { token: await captchaToken() }
  } catch {
    return { error: 'Could not check that you are human. Reload the page and try again.' }
  }
}

function friendly(message: string): string {
  if (/captcha/i.test(message)) return 'The human check failed. Reload the page and try again.'
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.'
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox.'
  if (/anonymous sign-ins are disabled/i.test(message)) return 'Guest online play is not switched on yet.'
  if (/provider is not enabled/i.test(message)) return 'Google login is not switched on yet. Use email for now.'
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a minute and try again.'
  return message
}
