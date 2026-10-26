import { describe, expect, it } from 'vitest'
import { LESSONS, lessonById } from '../content/lessons/catalog'
import { currentLesson, emptyProgress, hasProgress, lessonStatus, mergeProgress, recordAttempt, starsFor } from './progress'

const l = (id: string) => lessonById(id)!

describe('stars', () => {
  it('0 below the pass mark, then 1, 2 and 3 stars', () => {
    const lesson = l('l003') // stage 1: pass 90% and 6 WPM, target 12 WPM
    expect(starsFor(lesson, 20, 89)).toBe(0)
    expect(starsFor(lesson, 5, 99)).toBe(0)
    expect(starsFor(lesson, 8, 91)).toBe(1)
    expect(starsFor(lesson, 8, 96)).toBe(2)
    expect(starsFor(lesson, 11, 99)).toBe(2) // accurate but under the stage target speed
    expect(starsFor(lesson, 12, 98)).toBe(3)
  })

  it('checkpoints need the stage target to pass', () => {
    const cp = LESSONS.find((x) => x.type === 'checkpoint' && x.stage === 1)!
    expect(starsFor(cp, 11, 99)).toBe(0)
    expect(starsFor(cp, 12, 93)).toBe(1)
  })

  it('intro lessons are always 3 stars', () => {
    expect(starsFor(l('l001'), 0, 0)).toBe(3)
  })
})

describe('progress', () => {
  it('starts at lesson 1 and moves on after a pass', () => {
    let p = emptyProgress()
    expect(currentLesson(LESSONS, p)?.id).toBe('l001')
    p = recordAttempt(p, l('l001'), 0, 0)
    expect(currentLesson(LESSONS, p)?.id).toBe('l002')
  })

  it('a failed attempt is recorded but does not pass', () => {
    const p = recordAttempt(emptyProgress(), l('l003'), 3, 70)
    expect(p.lessons.l003).toMatchObject({ passed: false, stars: 0, attempts: 1 })
  })

  it('keeps the best scores and never loses a pass', () => {
    let p = recordAttempt(emptyProgress(), l('l003'), 12, 99)
    p = recordAttempt(p, l('l003'), 4, 60)
    expect(p.lessons.l003).toMatchObject({ passed: true, stars: 3, bestWpm: 12, bestAccuracy: 99, attempts: 2 })
  })

  it('tested-out stages are skipped and the current lesson comes after them', () => {
    const p = { ...emptyProgress(), testedOutStages: [0, 1] }
    const current = currentLesson(LESSONS, p)!
    expect(current.stage).toBe(2)
    expect(lessonStatus(l('l005'), p, current)).toBe('skipped')
    expect(lessonStatus(current, p, current)).toBe('current')
    expect(lessonStatus(l('l100'), p, current)).toBe('locked')
  })

  it('sums key stats across attempts', () => {
    let p = recordAttempt(emptyProgress(), l('l003'), 10, 95, { f: { attempts: 5, misses: 1, totalMs: 500 } })
    p = recordAttempt(p, l('l003'), 10, 95, { f: { attempts: 3, misses: 2, totalMs: 300 } })
    expect(p.keyStats.f).toEqual({ attempts: 8, misses: 3, totalMs: 800 })
  })
})

describe('mergeProgress', () => {
  it('keeps the best of each lesson, sums key stats and unions skipped stages', () => {
    const guest = { ...recordAttempt(emptyProgress(), l('l003'), 12, 99, { f: { attempts: 2, misses: 1, totalMs: 10 } }), testedOutStages: [0] }
    const account = { ...recordAttempt(emptyProgress(), l('l003'), 8, 91, { f: { attempts: 3, misses: 0, totalMs: 5 } }), testedOutStages: [1] }
    const m = mergeProgress(guest, account)
    expect(m.lessons.l003).toMatchObject({ stars: 3, bestWpm: 12, bestAccuracy: 99, passed: true, attempts: 2 })
    expect(m.keyStats.f).toEqual({ attempts: 5, misses: 1, totalMs: 15 })
    expect(m.testedOutStages).toEqual([0, 1])
  })

  it('hasProgress is false for an empty journey', () => {
    expect(hasProgress(emptyProgress())).toBe(false)
    expect(hasProgress(recordAttempt(emptyProgress(), l('l001'), 0, 0))).toBe(true)
  })
})
