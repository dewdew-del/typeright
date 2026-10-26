import { LESSONS, STAGE_TARGET_ACCURACY, STAGE_TARGET_WPM } from '../content/lessons/catalog'
import type { LessonDef } from '../content/lessons/types'

/**
 * The optional level test: one short typing check per step. Each step covers one or more Journey
 * stages; a stage is "tested out" when the step's result meets that stage's checkpoint target.
 * The test stops at the first stage that is not met.
 */
export interface LevelStep {
  label: string
  /** Stages this step can skip, easiest first. */
  stages: number[]
}

export const LEVEL_STEPS: LevelStep[] = [
  { label: 'Home row', stages: [1] },
  { label: 'Top row', stages: [2] },
  { label: 'Bottom row', stages: [3, 4] },
  { label: 'Capitals', stages: [5] },
  { label: 'Punctuation', stages: [6] },
  { label: 'Numbers', stages: [7] },
  { label: 'Symbols', stages: [8] },
  { label: 'Sentences', stages: [9, 10, 11, 12] },
]

export const STEP_MS = 20_000

/** The checkpoint lesson whose text the step uses (the step's first stage). */
export function stepLesson(step: LevelStep): LessonDef {
  return LESSONS.find((l) => l.type === 'checkpoint' && l.stage === step.stages[0])!
}

export interface StepResult {
  wpm: number
  accuracy: number
}

const meets = (stage: number, r: StepResult) => r.wpm >= STAGE_TARGET_WPM[stage] && r.accuracy >= STAGE_TARGET_ACCURACY[stage]

/** Stages passed in this step, in order, stopping at the first miss. */
export function passedStages(step: LevelStep, r: StepResult): number[] {
  const out: number[] = []
  for (const s of step.stages) {
    if (!meets(s, r)) break
    out.push(s)
  }
  return out
}

/** True when the test should continue to the next step (every stage in this step was passed). */
export function stepCleared(step: LevelStep, r: StepResult): boolean {
  return passedStages(step, r).length === step.stages.length
}

export interface Placement {
  /** Stages to mark as tested out (includes Start when Home row is passed). */
  testedOut: number[]
  /** The stage the learner starts at. */
  startStage: number
}

/** Placement from the results of the steps taken, in order. */
export function placement(results: StepResult[]): Placement {
  const testedOut: number[] = []
  for (let i = 0; i < results.length && i < LEVEL_STEPS.length; i++) {
    const passed = passedStages(LEVEL_STEPS[i], results[i])
    testedOut.push(...passed)
    if (passed.length < LEVEL_STEPS[i].stages.length) break
  }
  if (testedOut.includes(1)) testedOut.unshift(0)
  const startStage = Array.from({ length: 13 }, (_, s) => s).find((s) => !testedOut.includes(s)) ?? 12
  return { testedOut, startStage }
}
