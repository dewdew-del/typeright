import { describe, expect, it } from 'vitest'
import { allowedKeys, LESSONS, lessonById, STAGE_NAMES } from '../content/lessons/catalog'
import { SHIFT } from '../content/lessons/types'
import { targetForChar } from '../layouts/qwerty'
import { buildDrill, weakWeights } from './drill'

const drill = (id: string, seed = 1, weak?: Record<string, number>) => {
  const lesson = lessonById(id)!
  return buildDrill({ lesson, allowed: allowedKeys(lesson), seed, weak })
}

describe('lesson catalog', () => {
  it('has 200 lessons in 13 stages with the planned sizes', () => {
    expect(LESSONS).toHaveLength(200)
    expect(STAGE_NAMES).toHaveLength(13)
    const sizes = STAGE_NAMES.map((_, s) => LESSONS.filter((l) => l.stage === s).length)
    expect(sizes).toEqual([2, 20, 22, 20, 16, 14, 16, 18, 16, 20, 14, 14, 8])
  })

  it('numbers lessons 1-200 with unique ids', () => {
    expect(LESSONS.map((l) => l.order)).toEqual(Array.from({ length: 200 }, (_, i) => i + 1))
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(200)
  })

  it('ends every stage after Start with a checkpoint', () => {
    for (let s = 1; s <= 12; s++) {
      const stage = LESSONS.filter((l) => l.stage === s)
      expect(stage[stage.length - 1].type).toBe('checkpoint')
      expect(stage.filter((l) => l.type === 'checkpoint')).toHaveLength(1)
    }
  })

  it('unlocks all 26 letters by the end of Stage 3', () => {
    const lastOfStage3 = LESSONS.filter((l) => l.stage === 3).at(-1)!
    const allowed = allowedKeys(lastOfStage3)
    for (const c of 'abcdefghijklmnopqrstuvwxyz') expect(allowed.has(c)).toBe(true)
    expect(allowed.has(SHIFT)).toBe(false)
  })
})

describe('buildDrill', () => {
  it('produces non-empty, typable text that only uses unlocked keys, for every lesson', () => {
    for (const lesson of LESSONS) {
      if (lesson.style === 'intro') continue
      const allowed = allowedKeys(lesson)
      for (const seed of [1, 2, 3]) {
        const text = buildDrill({ lesson, allowed, seed })
        expect(text.length, lesson.title).toBeGreaterThan(0)
        for (const c of text) {
          expect(targetForChar(c), `${lesson.title}: "${c}"`).toBeDefined()
          const lower = c.toLowerCase()
          const ok = c === ' ' || allowed.has(c) || (c !== lower && allowed.has(SHIFT) && allowed.has(lower))
          expect(ok, `${lesson.title} uses locked "${c}"`).toBe(true)
        }
      }
    }
  })

  it('the first lesson only uses F, J and space', () => {
    expect(drill('l003')).toMatch(/^[fj ]+$/)
  })

  it('new-key lessons start with the new keys', () => {
    const text = drill('l007') // Keys D & K
    expect(text.slice(0, 20)).toMatch(/^[dk ]+$/)
  })

  it('is reproducible for the same seed and varies across seeds', () => {
    expect(drill('l030', 7)).toBe(drill('l030', 7))
    expect(drill('l030', 7)).not.toBe(drill('l030', 8))
  })

  it('stays close to the lesson length', () => {
    const lesson = lessonById('l030')!
    const text = drill('l030')
    expect(text.length).toBeGreaterThan(lesson.length * 0.8)
    expect(text.length).toBeLessThan(lesson.length * 1.3)
  })

  it('weak keys show up more often', () => {
    const count = (s: string, c: string) => [...s].filter((x) => x === c).length
    let plain = 0
    let weighted = 0
    for (let seed = 1; seed <= 20; seed++) {
      plain += count(drill('l042', seed), 'q')
      weighted += count(drill('l042', seed, { q: 3 }), 'q')
    }
    expect(weighted).toBeGreaterThan(plain)
  })
})

describe('weakWeights', () => {
  it('ignores keys with few attempts and caps the weight at 3', () => {
    expect(
      weakWeights({
        a: { attempts: 2, misses: 2, totalMs: 0 },
        b: { attempts: 10, misses: 1, totalMs: 0 },
        c: { attempts: 10, misses: 9, totalMs: 0 },
        d: { attempts: 10, misses: 0, totalMs: 0 },
      }),
    ).toEqual({ b: 2, c: 3 })
  })
})
