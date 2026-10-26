import type { TypingMode } from '../../../supabase/functions/_shared/scoring'

export type LessonType = 'intro' | 'new-keys' | 'review' | 'words' | 'accuracy' | 'speed' | 'game' | 'checkpoint'

/** How the drill text is generated. */
export type DrillStyle = 'intro' | 'drill' | 'words' | 'caps' | 'punct' | 'numbers' | 'symbols' | 'sentences' | 'text'

/** Marker in `newKeys` meaning "capital letters are allowed from here on". */
export const SHIFT = 'SHIFT'

export interface LessonDef {
  id: string
  /** 1-200. */
  order: number
  /** 0-12. */
  stage: number
  type: LessonType
  title: string
  /** Characters shown as key tiles on the lesson card ('' for none). */
  keys: string
  /** Characters this lesson introduces (letters, digits, punctuation, symbols, or SHIFT). */
  newKeys: string[]
  /** Characters the drill should emphasize. */
  focus: string[]
  style: DrillStyle
  /** Style-specific flavor, e.g. 'phone' for numbers or 'names' for capitals. */
  variant?: string
  mode: TypingMode
  /** Approximate number of characters to type. */
  length: number
  timeLimitMs?: number
  pass: { accuracy: number; wpm: number }
  tipId: string
}
