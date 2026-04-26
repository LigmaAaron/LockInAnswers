import type { ScoringConfig } from '../types/models'

export const defaultScoringConfig: ScoringConfig = {
  rewardByConfidence: [18, 32, 50, 74, 110],
  penaltyByConfidence: [16, 32, 54, 92, 170],
  suddenDeathEndsRun: true,
}

export const getScoreDelta = (
  isCorrect: boolean,
  confidence: number,
  scoringConfig: ScoringConfig = defaultScoringConfig,
) => {
  const safeConfidence = Math.min(5, Math.max(1, Math.round(confidence)))
  const idx = safeConfidence - 1
  return isCorrect
    ? scoringConfig.rewardByConfidence[idx]
    : -scoringConfig.penaltyByConfidence[idx]
}

export const applyScoreDelta = (currentScore: number, scoreDelta: number) =>
  Math.max(0, currentScore + scoreDelta)

export const getStreakMultiplier = (streak: number) => {
  if (streak >= 10) return 1.25
  if (streak >= 5) return 1.15
  if (streak >= 3) return 1.1
  return 1
}

export const isConfidenceAligned = (isCorrect: boolean, confidence: number) => {
  const predictsCorrect = confidence >= 3
  return predictsCorrect === isCorrect
}
