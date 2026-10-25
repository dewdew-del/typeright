export type Finger = 'LP' | 'LR' | 'LM' | 'LI' | 'T' | 'RI' | 'RM' | 'RR' | 'RP'
export type Hand = 'left' | 'right'

export interface KeyDef {
  /** Stable id, matches KeyboardEvent.code (e.g. "KeyF", "Digit1", "Space"). */
  code: string
  /** Character produced unshifted (empty for modifiers). */
  char: string
  /** Character produced with Shift, if any. */
  shiftChar?: string
  /** Text drawn on the keycap. */
  label: string
  finger: Finger
  /** Width in key units (1 = a normal letter key). */
  width: number
  /** Tactile bump (F and J). */
  bump?: boolean
}

export interface KeyboardLayout {
  id: string
  name: string
  rows: (KeyDef | { spacer: number })[][]
}

export const FINGER_NAMES: Record<Finger, string> = {
  LP: 'Left pinky',
  LR: 'Left ring',
  LM: 'Left middle',
  LI: 'Left index',
  T: 'Thumb',
  RI: 'Right index',
  RM: 'Right middle',
  RR: 'Right ring',
  RP: 'Right pinky',
}

export const FINGER_COLOR_VAR: Record<Finger, string> = {
  LP: 'var(--f-lp)',
  LR: 'var(--f-lr)',
  LM: 'var(--f-lm)',
  LI: 'var(--f-li)',
  T: 'var(--f-rt)',
  RI: 'var(--f-ri)',
  RM: 'var(--f-rm)',
  RR: 'var(--f-rr)',
  RP: 'var(--f-rp)',
}

export function handOf(finger: Finger): Hand | 'both' {
  if (finger === 'T') return 'both'
  return finger.startsWith('L') ? 'left' : 'right'
}
