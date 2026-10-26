import { describe, expect, it } from 'vitest'
import { allowedKeys } from '../content/lessons/catalog'
import { buildDrill } from './drill'
import { LEVEL_STEPS, passedStages, placement, stepCleared, stepLesson } from './levelTest'

describe('level test', () => {
  it('every step has a checkpoint lesson that produces text', () => {
    for (const step of LEVEL_STEPS) {
      const lesson = stepLesson(step)
      expect(lesson.type).toBe('checkpoint')
      expect(buildDrill({ lesson, allowed: allowedKeys(lesson), seed: 1 }).length).toBeGreaterThan(50)
    }
  })

  it('a beginner who fails the first step starts at the beginning', () => {
    expect(placement([{ wpm: 8, accuracy: 90 }])).toEqual({ testedOut: [], startStage: 0 })
  })

  it('passing Home row also skips Start', () => {
    const p = placement([{ wpm: 30, accuracy: 98 }, { wpm: 10, accuracy: 90 }])
    expect(p).toEqual({ testedOut: [0, 1], startStage: 2 })
  })

  it('a step can pass its first stage but not the next (Bottom row 18 vs Letter mastery 22 WPM)', () => {
    const bottom = LEVEL_STEPS[2]
    expect(passedStages(bottom, { wpm: 20, accuracy: 96 })).toEqual([3])
    expect(stepCleared(bottom, { wpm: 20, accuracy: 96 })).toBe(false)
    const p = placement([
      { wpm: 40, accuracy: 98 },
      { wpm: 40, accuracy: 98 },
      { wpm: 20, accuracy: 96 },
    ])
    expect(p).toEqual({ testedOut: [0, 1, 2, 3], startStage: 4 })
  })

  it('accuracy below the target fails even at high speed', () => {
    expect(placement([{ wpm: 90, accuracy: 85 }]).startStage).toBe(0)
  })

  it('an expert can test out of everything', () => {
    const fast = LEVEL_STEPS.map(() => ({ wpm: 80, accuracy: 99 }))
    expect(placement(fast).testedOut).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
})
