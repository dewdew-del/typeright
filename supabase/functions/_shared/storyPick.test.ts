import { describe, expect, it } from 'vitest'
import { finishedStoryIds, pickStories, type Story } from './storyPick'

const stories: Story[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, body: `Story number ${i + 1} is here.` }))

describe('pickStories', () => {
  it('uses unfinished stories first, never the same one twice in a run', () => {
    const done = new Set([1, 2, 3, 4, 5])
    const { ids } = pickStories(stories, done, 7, 100)
    expect(ids.slice(0, 5).every((id) => id > 5)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to finished stories when too few are left', () => {
    const done = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const { ids, text } = pickStories(stories, done, 3, 120)
    expect(ids[0]).toBe(10)
    expect(ids.length).toBeGreaterThan(1)
    expect(text.length).toBeGreaterThanOrEqual(120)
  })

  it('is the same for the same seed', () => {
    expect(pickStories(stories, new Set(), 42, 80)).toEqual(pickStories(stories, new Set(), 42, 80))
  })
})

describe('finishedStoryIds', () => {
  const run = [stories[0], stories[1], stories[2]]
  const first = run[0].body.length
  it('counts only stories typed to their last character', () => {
    expect(finishedStoryIds(run, 0)).toEqual([])
    expect(finishedStoryIds(run, first - 1)).toEqual([])
    expect(finishedStoryIds(run, first)).toEqual([1])
    expect(finishedStoryIds(run, first + 1 + run[1].body.length)).toEqual([1, 2])
  })
})
