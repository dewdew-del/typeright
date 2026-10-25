import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('auto: light from 06:00 to 17:59, dark otherwise', () => {
    expect(resolveTheme('auto', 5)).toBe('dark')
    expect(resolveTheme('auto', 6)).toBe('light')
    expect(resolveTheme('auto', 17)).toBe('light')
    expect(resolveTheme('auto', 18)).toBe('dark')
    expect(resolveTheme('auto', 0)).toBe('dark')
  })

  it('forced modes ignore the clock', () => {
    expect(resolveTheme('dark', 12)).toBe('dark')
    expect(resolveTheme('light', 23)).toBe('light')
  })
})
