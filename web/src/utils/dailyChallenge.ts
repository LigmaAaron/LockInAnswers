import type { Challenge } from '../types/models'
import { storage } from './storage'

const CHALLENGES_KEY = 'lia-challenges'
const DAILY_HISTORY_KEY = 'lia-daily-history'
const DAILY_SELECTION_KEY = 'lia-daily-selection'
const DAILY_COMPLETION_KEY = 'lia-daily-completion'
const MAX_HISTORY_SIZE = 20

type DailySelectionState = {
  date: string
  challengeId: string
}

type DailyCompletionState = {
  date: string
  challengeId: string
}

type StoredChallengeMap = Record<string, Challenge>

export const getTodayDateKey = () => new Date().toISOString().split('T')[0]

export function hashString(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const loadChallengesFromStorage = (): Challenge[] => {
  const saved = storage.get<StoredChallengeMap | Challenge[]>(CHALLENGES_KEY, [])
  if (Array.isArray(saved)) {
    return saved
  }
  return Object.values(saved)
}

const getCandidateChallenges = (challenges: Challenge[]) => {
  const publishedChallenges = challenges.filter((challenge) => challenge.status !== 'draft')

  if (publishedChallenges.length === 0) {
    return []
  }

  const modeCandidates = publishedChallenges.filter(
    (challenge) => challenge.mode === 'casual' || challenge.mode === 'competitive',
  )
  const baseCandidates = modeCandidates.length > 0 ? modeCandidates : publishedChallenges

  const verifiedCandidates = baseCandidates.filter(
    (challenge) => (challenge.is_verified ?? challenge.isVerified) === true,
  )
  return verifiedCandidates.length > 0 ? verifiedCandidates : baseCandidates
}

const appendHistory = (history: string[], challengeId: string) => {
  const nextHistory = [...history, challengeId]
  return nextHistory.slice(-MAX_HISTORY_SIZE)
}

const saveDailySelection = (selection: DailySelectionState) => {
  storage.set(DAILY_SELECTION_KEY, selection)
}

const getDailySelection = () =>
  storage.get<DailySelectionState | null>(DAILY_SELECTION_KEY, null)

const saveHistory = (history: string[]) => {
  storage.set(DAILY_HISTORY_KEY, history)
}

const getHistory = () => storage.get<string[]>(DAILY_HISTORY_KEY, [])

export const getDailyChallengeFromChallenges = (allChallenges: Challenge[]): Challenge | null => {
  const today = getTodayDateKey()

  if (allChallenges.length === 0) {
    return null
  }

  const candidatePool = getCandidateChallenges(allChallenges)
  if (candidatePool.length === 0) {
    return null
  }

  const existingSelection = getDailySelection()
  if (existingSelection?.date === today) {
    const selected = candidatePool.find((challenge) => challenge.id === existingSelection.challengeId)
    if (selected) {
      return selected
    }
  }

  let history = getHistory()
  let candidates = candidatePool.filter((challenge) => !history.includes(challenge.id))

  if (candidates.length === 0) {
    history = []
    saveHistory(history)
    candidates = candidatePool
  }

  const index = hashString(today) % candidates.length
  const selectedChallenge = candidates[index]

  if (!selectedChallenge) {
    return null
  }

  const nextHistory = appendHistory(history, selectedChallenge.id)
  saveHistory(nextHistory)
  saveDailySelection({ date: today, challengeId: selectedChallenge.id })

  return selectedChallenge
}

export const getDailyChallenge = (): Challenge | null => getDailyChallengeFromChallenges(loadChallengesFromStorage())

export const markDailyChallengeCompletedToday = (challengeId: string) => {
  const completion: DailyCompletionState = {
    date: getTodayDateKey(),
    challengeId,
  }
  storage.set(DAILY_COMPLETION_KEY, completion)
}

export const isDailyChallengeCompletedToday = (challengeId: string) => {
  const completion = storage.get<DailyCompletionState | null>(DAILY_COMPLETION_KEY, null)
  if (!completion) {
    return false
  }

  return completion.date === getTodayDateKey() && completion.challengeId === challengeId
}