import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 'auto' follows the visitor's clock (light from 06:00 to 17:59); light and dark force a theme. */
export type ThemeMode = 'auto' | 'light' | 'dark'
export type TextSize = 'sm' | 'md' | 'lg'

interface SettingsState {
  theme: ThemeMode
  sound: boolean
  showKeyboard: boolean
  showHands: boolean
  textSize: TextSize
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'auto',
      sound: false,
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
