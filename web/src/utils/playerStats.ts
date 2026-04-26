import type { ChallengeRun } from '../types/models'
import { storage } from './storage'

export const USER_STATS_KEY = 'lia-user-stats'

export type PlayerStatsAggregate = {
  totalAnswers: number
  totalCorrect: number
  totalConfidence: number
  highConfCorrect: number
  lowConfWrong: number
  gamesPlayed: number
}

const emptyStats: PlayerStatsAggregate = {
  totalAnswers: 0,
  totalCorrect: 0,
  totalConfidence: 0,
  highConfCorrect: 0,
  lowConfWrong: 0,
  gamesPlayed: 0,
}

const toNumber = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }

  return value
}

const normalizeStats = (stats?: Partial<PlayerStatsAggregate> | null): PlayerStatsAggregate => {
  if (!stats) {
    return emptyStats
  }

  return {
    totalAnswers: Math.max(0, Math.floor(toNumber(stats.totalAnswers))),
    totalCorrect: Math.max(0, Math.floor(toNumber(stats.totalCorrect))),
    totalConfidence: Math.max(0, toNumber(stats.totalConfidence)),
    highConfCorrect: Math.max(0, Math.floor(toNumber(stats.highConfCorrect))),
    lowConfWrong: Math.max(0, Math.floor(toNumber(stats.lowConfWrong))),
    gamesPlayed: Math.max(0, Math.floor(toNumber(stats.gamesPlayed))),
  }
}

const setPlayerStats = (stats: PlayerStatsAggregate) => {
  storage.set(USER_STATS_KEY, stats)
}

export const getPlayerStats = () =>
  normalizeStats(storage.get<Partial<PlayerStatsAggregate> | null>(USER_STATS_KEY, null))

export const buildPlayerStatsFromRuns = (runs: ChallengeRun[]): PlayerStatsAggregate => {
  const aggregate = runs.reduce<PlayerStatsAggregate>(
    (acc, run) => {
      run.answers.forEach((answer) => {
        acc.totalAnswers += 1
        acc.totalConfidence += answer.confidence

        if (answer.isCorrect) {
          acc.totalCorrect += 1
          if (answer.confidence >= 4) {
            acc.highConfCorrect += 1
          }
          return
        }

        if (answer.confidence <= 2) {
          acc.lowConfWrong += 1
        }
      })

      acc.gamesPlayed += 1
      return acc
    },
    { ...emptyStats },
  )

  return aggregate
}

export const ensurePlayerStatsFromRuns = (runs: ChallengeRun[]) => {
  const existingRaw = storage.get<Partial<PlayerStatsAggregate> | null>(USER_STATS_KEY, null)
  if (existingRaw) {
    const normalized = normalizeStats(existingRaw)
    setPlayerStats(normalized)
    return normalized
  }

  const seeded = buildPlayerStatsFromRuns(runs)
  setPlayerStats(seeded)
  return seeded
}

export const appendPlayerStatsFromAnswers = (
  answers: Array<{ isCorrect: boolean; confidence: number }>,
) => {
  const current = getPlayerStats()
  const next = { ...current, gamesPlayed: current.gamesPlayed + 1 }

  answers.forEach((answer) => {
    next.totalAnswers += 1
    next.totalConfidence += answer.confidence

    if (answer.isCorrect) {
      next.totalCorrect += 1
      if (answer.confidence >= 4) {
        next.highConfCorrect += 1
      }
      return
    }

    if (answer.confidence <= 2) {
      next.lowConfWrong += 1
    }
  })

  setPlayerStats(next)
  return next
}
