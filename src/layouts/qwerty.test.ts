import { describe, expect, it } from 'vitest'
import { ALL_KEYS, QWERTY, targetForChar } from './qwerty'

describe('QWERTY layout', () => {
  it('has exactly two home-row bumps, on F and J', () => {
    expect(ALL_KEYS.filter((x) => x.bump).map((x) => x.char)).toEqual(['f', 'j'])
  })

  it('assigns home-row fingers correctly', () => {
    const fingers = 'asdfjkl;'.split('').map((c) => targetForChar(c)!.key.finger)
    expect(fingers).toEqual(['LP', 'LR', 'LM', 'LI', 'RI', 'RM', 'RR', 'RP'])
  })

  it('rows are 15 units wide', () => {
    for (const row of QWERTY.rows) {
      const w = row.reduce((s, x) => s + ('spacer' in x ? x.spacer : x.width), 0)
      expect(w).toBeCloseTo(15, 5)
    }
  })

  it('uppercase letters need the opposite hand Shift', () => {
    expect(targetForChar('A')).toMatchObject({ needsShift: true })
    expect(targetForChar('A')!.shiftKey!.code).toBe('ShiftRight')
    expect(targetForChar('K')!.shiftKey!.code).toBe('ShiftLeft')
  })

  it('maps symbols and space', () => {
    expect(targetForChar('!')!.key.code).toBe('Digit1')
    expect(targetForChar(' ')!.key.finger).toBe('T')
    expect(targetForChar('é')).toBeUndefined()
  })
})
