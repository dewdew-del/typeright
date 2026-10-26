import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? friendly(error.message) : null
  },

  /** Google sign-in. For a guest, links Google to the guest account instead (same id). */
  async google(): Promise<string | null> {
    if (!supabase) return 'Accounts are not set up yet.'
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
    const { error } = await supabase.auth.signInAnonymously()
    return error ? friendly(error.message) : null
  },

  async resetPassword(email: string): Promise<string | null> {
    if (!supabase) return 'Accounts are not set up yet.'
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect('/profile?set-password=1') })
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
    if (error) return error.code === '23505' ? 'That username is taken.' : friendly(error.message)
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
    await supabase?.auth.signOut()
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

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.'
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox.'
  if (/anonymous sign-ins are disabled/i.test(message)) return 'Guest online play is not switched on yet.'
  if (/provider is not enabled/i.test(message)) return 'Google login is not switched on yet. Use email for now.'
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a minute and try again.'
  return message
}
