import { useState } from 'react'
import { Choice } from '../components/ui/Choice'
import { useAuth } from '../storage/authStore'
import { useProgress } from '../storage/progressStore'
import { clearRemoteProgress } from '../storage/progressSync'
import { useSettings, type TextSize, type ThemeMode } from '../stores/settings'

export function Settings() {
  const { theme, sound, showKeyboard, showHands, textSize, set } = useSettings()
  const resetProgress = useProgress((s) => s.reset)
  const signedIn = useAuth((s) => s.user !== null && !s.isAnonymous)
  const [cleared, setCleared] = useState(false)
  const onOff = [
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
  ] as const

  return (
    <main className="mx-auto flex max-w-[680px] flex-col gap-8 px-6 pb-16 pt-2">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <section className="flex flex-col gap-7 rounded-3xl border border-border bg-surface p-6 sm:p-7">
        <Choice<ThemeMode>
          label="Theme"
          value={theme}
          onChange={(v) => set({ theme: v })}
          options={[
            { value: 'auto', label: 'Auto (by time of day)' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <Choice<TextSize>
          label="Text size"
          value={textSize}
          onChange={(v) => set({ textSize: v })}
          options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ]}
        />
        <Choice label="Key sounds" value={sound ? 'on' : 'off'} onChange={(v) => set({ sound: v === 'on' })} options={[...onOff]} />
        <Choice label="On-screen keyboard in lessons" value={showKeyboard ? 'on' : 'off'} onChange={(v) => set({ showKeyboard: v === 'on' })} options={[...onOff]} />
        <Choice label="Hand guide in lessons" value={showHands ? 'on' : 'off'} onChange={(v) => set({ showHands: v === 'on' })} options={[...onOff]} />
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6 sm:p-7">
        <div className="text-sm font-bold">Progress</div>
        <p className="text-sm text-muted">
          {signedIn ? 'Your progress is saved to your account.' : 'As a guest, your progress is kept only until you close the site.'}
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(signedIn ? 'Clear all lesson progress and key stats from your account?' : 'Clear all lesson progress and key stats in this tab?')) {
              if (signedIn) void clearRemoteProgress()
              resetProgress()
              setCleared(true)
            }
          }}
          className="self-start rounded-xl border border-border bg-bg px-5 py-2.5 text-sm font-bold text-bad hover:bg-surface-2"
        >
          Clear my progress
        </button>
        {cleared && <p role="status" className="text-sm font-semibold text-good">Progress cleared.</p>}
      </section>
    </main>
  )
}
