import type { TypingFont } from '../stores/settings'

/** Font stacks for the text you type. Kept apart from the settings pop-up so the typing area does not pull it in. */
export const FONT_FAMILY: Record<TypingFont, string> = {
  mono: "ui-monospace, 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
  sans: "'Inter Variable', system-ui, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
}
