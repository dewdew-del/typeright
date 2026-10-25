import type { Finger, KeyDef, KeyboardLayout } from './types'

const k = (
  code: string,
  char: string,
  finger: Finger,
  opts: Partial<KeyDef> = {},
): KeyDef => ({ code, char, label: char.toUpperCase(), finger, width: 1, ...opts })

const mod = (code: string, label: string, finger: Finger, width: number): KeyDef => ({
  code,
  char: '',
  label,
  finger,
  width,
})

const letter = (c: string, finger: Finger, opts: Partial<KeyDef> = {}) =>
  k(`Key${c.toUpperCase()}`, c, finger, { shiftChar: c.toUpperCase(), ...opts })

const sym = (code: string, char: string, shiftChar: string, finger: Finger, width = 1): KeyDef => ({
  code,
  char,
  shiftChar,
  label: shiftChar + '\n' + char,
  finger,
  width,
})

const digit = (n: string, shiftChar: string, finger: Finger) =>
  sym(`Digit${n}`, n, shiftChar, finger)

/** ANSI US QWERTY. Other layouts (Dvorak, Colemak…) can be added as sibling files. */
export const QWERTY: KeyboardLayout = {
  id: 'qwerty',
  name: 'QWERTY',
  rows: [
    [
      sym('Backquote', '`', '~', 'LP'),
      digit('1', '!', 'LP'),
      digit('2', '@', 'LR'),
      digit('3', '#', 'LM'),
      digit('4', '$', 'LI'),
      digit('5', '%', 'LI'),
      digit('6', '^', 'RI'),
      digit('7', '&', 'RI'),
      digit('8', '*', 'RM'),
      digit('9', '(', 'RR'),
      digit('0', ')', 'RP'),
      sym('Minus', '-', '_', 'RP'),
      sym('Equal', '=', '+', 'RP'),
      mod('Backspace', 'Backspace', 'RP', 2),
    ],
    [
      mod('Tab', 'Tab', 'LP', 1.5),
      letter('q', 'LP'),
      letter('w', 'LR'),
      letter('e', 'LM'),
      letter('r', 'LI'),
      letter('t', 'LI'),
      letter('y', 'RI'),
      letter('u', 'RI'),
      letter('i', 'RM'),
      letter('o', 'RR'),
      letter('p', 'RP'),
      sym('BracketLeft', '[', '{', 'RP'),
      sym('BracketRight', ']', '}', 'RP'),
      sym('Backslash', '\\', '|', 'RP', 1.5),
    ],
    [
      mod('CapsLock', 'Caps', 'LP', 1.75),
      letter('a', 'LP'),
      letter('s', 'LR'),
      letter('d', 'LM'),
      letter('f', 'LI', { bump: true }),
      letter('g', 'LI'),
      letter('h', 'RI'),
      letter('j', 'RI', { bump: true }),
      letter('k', 'RM'),
      letter('l', 'RR'),
      sym('Semicolon', ';', ':', 'RP'),
      sym('Quote', "'", '"', 'RP'),
      mod('Enter', 'Enter', 'RP', 2.25),
    ],
    [
      mod('ShiftLeft', 'Shift', 'LP', 2.25),
      letter('z', 'LP'),
      letter('x', 'LR'),
      letter('c', 'LM'),
      letter('v', 'LI'),
      letter('b', 'LI'),
      letter('n', 'RI'),
      letter('m', 'RI'),
      sym('Comma', ',', '<', 'RM'),
      sym('Period', '.', '>', 'RR'),
      sym('Slash', '/', '?', 'RP'),
      mod('ShiftRight', 'Shift', 'RP', 2.75),
    ],
    [{ spacer: 4.375 }, { ...mod('Space', '', 'T', 6.25), char: ' ' }, { spacer: 4.375 }],
  ],
}

export const ALL_KEYS: KeyDef[] = QWERTY.rows
  .flat()
  .filter((x): x is KeyDef => 'code' in x)

export interface KeyTarget {
  key: KeyDef
  /** True when the character needs Shift held. */
  needsShift: boolean
  /** Shift on the hand opposite to the typing finger. */
  shiftKey?: KeyDef
}

const byCode = new Map(ALL_KEYS.map((x) => [x.code, x]))
const SHIFT_LEFT = byCode.get('ShiftLeft')!
const SHIFT_RIGHT = byCode.get('ShiftRight')!

const charMap = new Map<string, KeyTarget>()
for (const key of ALL_KEYS) {
  if (key.char) charMap.set(key.char, { key, needsShift: false })
  if (key.shiftChar) {
    const leftHand = key.finger.startsWith('L')
    charMap.set(key.shiftChar, {
      key,
      needsShift: true,
      shiftKey: leftHand ? SHIFT_RIGHT : SHIFT_LEFT,
    })
  }
}

/** Which key (and Shift, if needed) types this character? Undefined if not on the layout. */
export function targetForChar(ch: string): KeyTarget | undefined {
  return charMap.get(ch)
}

export function keyByCode(code: string): KeyDef | undefined {
  return byCode.get(code)
}
