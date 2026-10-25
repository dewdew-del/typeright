import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'
export type TextSize = 'sm' | 'md' | 'lg'

interface SettingsState {
  theme: Theme
  sound: boolean
  showKeyboard: boolean
  showHands: boolean
  textSize: TextSize
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void
}

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: prefersDark() ? 'dark' : 'light',
      sound: true,
      showKeyboard: true,
      showHands: true,
      textSize: 'md',
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
