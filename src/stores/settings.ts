import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SoundPack } from '../lib/sound'

/** 'auto' follows the visitor's clock (light from 06:00 to 17:59); light and dark force a theme. */
export type ThemeMode = 'auto' | 'light' | 'dark'
export type TextSize = 'sm' | 'md' | 'lg'
/** Font for the text you type. */
export type TypingFont = 'mono' | 'sans' | 'serif'

interface SettingsState {
  theme: ThemeMode
  sound: boolean
  soundPack: SoundPack
  showKeyboard: boolean
  textSize: TextSize
  font: TypingFont
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'auto',
      sound: false,
      soundPack: 'mechanical',
      showKeyboard: true,
      textSize: 'md',
      font: 'mono',
      set: (patch) => set(patch),
    }),
    {
      name: 'typeright.settings',
      version: 1,
      // localStorage can throw (private mode, blocked storage); fall back to memory.
      storage: {
        getItem: (name) => {
          try {
            const v = localStorage.getItem(name)
            return v ? JSON.parse(v) : null
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch {
            /* ignore */
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name)
          } catch {
            /* ignore */
          }
        },
      },
    },
  ),
)

/** Which pop-up is open: settings dialog, profile side panel or leaderboard. */
interface UiState {
  panel: 'settings' | 'profile' | 'leaderboard' | null
  open: (panel: 'settings' | 'profile' | 'leaderboard') => void
  close: () => void
}

export const useUi = create<UiState>()((set) => ({
  panel: null,
  open: (panel) => set({ panel }),
  close: () => set({ panel: null }),
}))
