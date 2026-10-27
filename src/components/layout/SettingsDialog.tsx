import type { ReactNode } from 'react'
import { playKeySound, SOUND_PACKS, type SoundPack } from '../../lib/sound'
import { useSettings, useUi, type TextSize, type TypingFont } from '../../stores/settings'
import { Overlay } from './Overlay'

export const FONT_FAMILY: Record<TypingFont, string> = {
  mono: "ui-monospace, 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  sans: "'Inter Variable', system-ui, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col">
      <h3 className="pb-1 text-xs font-bold uppercase tracking-[0.08em] text-muted">{title}</h3>
      <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-bg px-4">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold">{label}</div>
        {hint && <div className="text-[13px] text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/** A small connected set of choices where exactly one is selected. */
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-0.5 rounded-xl bg-surface-2 p-0.5">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={['rounded-[10px] px-3.5 py-1.5 text-sm font-semibold', on ? 'bg-accent text-accent-contrast shadow-sm' : 'text-muted hover:text-text'].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={['relative h-7 w-12 rounded-full transition-colors motion-reduce:transition-none', checked ? 'bg-accent' : 'bg-border'].join(' ')}
    >
      <span
        aria-hidden
        className={['absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all motion-reduce:transition-none', checked ? 'left-[22px]' : 'left-0.5'].join(' ')}
      />
    </button>
  )
}

/** Settings as a pop-up, so you never leave what you were doing. */
export function SettingsDialog() {
  const { panel, close } = useUi()
  const { sound, soundPack: savedPack, showKeyboard, textSize, font, set } = useSettings()
  if (panel !== 'settings') return null
  // A style that was removed (for example one chosen earlier) falls back to the default.
  const soundPack: SoundPack = SOUND_PACKS.some((p) => p.value === savedPack) ? savedPack : 'default'

  return (
    <Overlay title="Settings" onClose={close}>
      <Section title="Typing">
        <Row label="Text size">
          <Segmented<TextSize>
            label="Text size"
            value={textSize}
            onChange={(v) => set({ textSize: v })}
            options={[{ value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }]}
          />
        </Row>
        <Row label="Font">
          <Segmented<TypingFont>
            label="Typing font"
            value={font}
            onChange={(v) => set({ font: v })}
            options={[{ value: 'mono', label: 'Mono' }, { value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }]}
          />
        </Row>
        <p className="py-3 text-base text-muted" style={{ fontFamily: FONT_FAMILY[font] }}>
          The quick brown fox jumps over the lazy dog.
        </p>
      </Section>

      <Section title="Sound">
        <Row label="Key sounds">
          <Switch
            label="Key sounds"
            checked={sound}
            onChange={(v) => {
              set({ sound: v })
              if (v) playKeySound(true, soundPack)
            }}
          />
        </Row>
        {sound && (
          <Row label="Style" hint="Pick one to hear it">
            <select
              aria-label="Sound style"
              value={soundPack}
              onChange={(e) => {
                const v = e.target.value as SoundPack
                set({ soundPack: v })
                playKeySound(true, v)
              }}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {SOUND_PACKS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Row>
        )}
      </Section>

      <Section title="Lessons">
        <Row label="On-screen keyboard">
          <Switch label="On-screen keyboard in lessons" checked={showKeyboard} onChange={(v) => set({ showKeyboard: v })} />
        </Row>
      </Section>
    </Overlay>
  )
}
