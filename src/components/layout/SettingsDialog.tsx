import { Choice } from '../ui/Choice'
import { useSettings, useUi, type TextSize, type TypingFont } from '../../stores/settings'
import { Overlay } from './Overlay'

export const FONT_FAMILY: Record<TypingFont, string> = {
  mono: "ui-monospace, 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  sans: "'Inter Variable', system-ui, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
}

/** Settings as a pop-up, so you never leave what you were doing. */
export function SettingsDialog() {
  const { panel, close } = useUi()
  const { sound, showKeyboard, textSize, font, set } = useSettings()
  if (panel !== 'settings') return null
  const onOff = [
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
  ]

  return (
    <Overlay title="Settings" onClose={close}>
      <Choice<TextSize>
        label="Text size"
        value={textSize}
        onChange={(v) => set({ textSize: v })}
        options={[{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }]}
      />
      <div className="flex flex-col gap-3">
        <Choice<TypingFont>
          label="Typing font"
          value={font}
          onChange={(v) => set({ font: v })}
          options={[{ value: 'mono', label: 'Monospace' }, { value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }]}
        />
        <p className="rounded-xl bg-bg px-4 py-3 text-lg" style={{ fontFamily: FONT_FAMILY[font] }}>
          The quick brown fox jumps over the lazy dog.
        </p>
      </div>
      <Choice label="Key sounds" value={sound ? 'on' : 'off'} onChange={(v) => set({ sound: v === 'on' })} options={onOff} />
      <Choice label="On-screen keyboard in lessons" value={showKeyboard ? 'on' : 'off'} onChange={(v) => set({ showKeyboard: v === 'on' })} options={onOff} />
    </Overlay>
  )
}
