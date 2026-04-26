import type { Challenge, ChallengeRun } from '../types/models'

export type LeaderboardTimeFilter = 'all-time' | 'this-week'

export type LeaderboardRowData = {
  userId: string
  username: string
  rank: number
  value: number
  secondaryText?: string
}

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000

const getWindowStart = (timeFilter: LeaderboardTimeFilter, now = Date.now()) =>
  timeFilter === 'this-week' ? now - WEEK_IN_MS : Number.NEGATIVE_INFINITY

const formatInteger = (value: number) => new Intl.NumberFormat().format(Math.round(value))

const isRankedChallenge = (challenge: Challenge) => (challenge.is_verified ?? challenge.isVerified) === true && challenge.settings.leaderboard

export function buildRankedLeaderboard(
  challenges: Challenge[],
  runs: ChallengeRun[],
  timeFilter: LeaderboardTimeFilter,
  now = Date.now(),
): LeaderboardRowData[] {
  const challengeById = new Map(challenges.map((challenge) => [challenge.id, challenge]))
  const windowStart = getWindowStart(timeFilter, now)

  const totalsByUser = new Map<
    string,
    {
      userId: string
      username: string
      value: number
      sourceCount: number
      firstActivityAt: number
    }
  >()

  for (const run of runs) {
    const challenge = challengeById.get(run.challengeId)
    if (!challenge || !isRankedChallenge(challenge)) {
      continue
    }

    const completedAt = Date.parse(run.createdAt)
    if (Number.isNaN(completedAt) || completedAt < windowStart) {
      continue
    }

    const current = totalsByUser.get(run.userId)
    if (!current) {
      totalsByUser.set(run.userId, {
        userId: run.userId,
        username: run.userName,
        value: run.score,
        sourceCount: 1,
        firstActivityAt: completedAt,
      })
      continue
    }

    current.username = run.userName
    current.value += run.score
    current.sourceCount += 1
    current.firstActivityAt = Math.min(current.firstActivityAt, completedAt)
  }

  return Array.from(totalsByUser.values())
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value
      }

      if (a.firstActivityAt !== b.firstActivityAt) {
        return a.firstActivityAt - b.firstActivityAt
      }

      return a.username.localeCompare(b.username)
    })
    .map((row, index) => ({
      userId: row.userId,
      username: row.username,
      rank: index + 1,
      value: row.value,
      secondaryText: `${formatInteger(row.sourceCount)} verified run${row.sourceCount === 1 ? '' : 's'}`,
    }))
}

export function buildChallengeLeaderboard(
  challenge: Challenge,
  runs: ChallengeRun[],
  timeFilter: LeaderboardTimeFilter,
  now = Date.now(),
): LeaderboardRowData[] {
  const windowStart = getWindowStart(timeFilter, now)

  const bestByUser = new Map<
    string,
    {
      userId: string
      username: string
      value: number
      accuracy: number
      completedAt: number
    }
  >()

  for (const run of runs) {
    if (run.challengeId !== challenge.id) {
      continue
    }

    const completedAt = Date.parse(run.createdAt)
    if (Number.isNaN(completedAt) || completedAt < windowStart) {
      continue
    }

    const candidate = {
      userId: run.userId,
      username: run.userName,
      value: run.score,
      accuracy: run.total > 0 ? (run.correct / run.total) * 100 : 0,
      completedAt,
    }

    const current = bestByUser.get(run.userId)
    if (
      !current ||
      candidate.value > current.value ||
      (candidate.value === current.value && candidate.accuracy > current.accuracy) ||
      (candidate.value === current.value && candidate.accuracy === current.accuracy && candidate.completedAt < current.completedAt)
    ) {
      bestByUser.set(run.userId, candidate)
    }
  }

  return Array.from(bestByUser.values())
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value
      }

      if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy
      }

      if (a.completedAt !== b.completedAt) {
        return a.completedAt - b.completedAt
      }

      return a.username.localeCompare(b.username)
    })
    .map((row, index) => ({
      userId: row.userId,
      username: row.username,
      rank: index + 1,
      value: row.value,
      secondaryText: `Best accuracy ${Math.round(row.accuracy)}%`,
    }))
}