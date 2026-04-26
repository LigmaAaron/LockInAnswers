import type { PlayerStatsAggregate } from './playerStats'

export type CalculatedStats = {
  accuracy: number
  averageConfidence: number
  confidenceAccuracy: number
  gamesPlayed: number
}

export const calculateStats = (rawData: PlayerStatsAggregate): CalculatedStats => {
  const totalAnswers = rawData.totalAnswers

  return {
    accuracy: totalAnswers ? rawData.totalCorrect / totalAnswers : 0,
    averageConfidence: totalAnswers ? rawData.totalConfidence / totalAnswers : 0,
    confidenceAccuracy: totalAnswers
      ? (rawData.highConfCorrect + rawData.lowConfWrong) / totalAnswers
      : 0,
    gamesPlayed: rawData.gamesPlayed,
  }
}
