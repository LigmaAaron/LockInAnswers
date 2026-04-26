import type { RedemptionItemType, RedemptionQueueItem, SessionAnswer } from '../types/models'
import type { Challenge, QuizQuestion } from '../types/models'
import { storage } from './storage'
import { normalizeChallengeId } from './challengeIdentity'

export const REDEMPTION_QUEUE_KEY = 'lia-redemption-queue'
export const LOW_CONFIDENCE_LIMIT_PER_SESSION = 3
export const MAX_REDEMPTION_ITEMS = 75

const REDEMPTION_REASON_BY_TYPE: Record<RedemptionItemType, string> = {
  wrong_high_conf: 'You were confident but wrong',
  wrong: 'You got this wrong',
  low_conf_correct: 'You weren\'t sure about this',
}

const REDEMPTION_PRIORITY_BY_TYPE: Record<RedemptionItemType, number> = {
  wrong_high_conf: 3,
  wrong: 2,
  low_conf_correct: 1,
}

const inferTypeFromLegacyItem = (item: RedemptionQueueItem): RedemptionItemType => {
  if (item.type) {
    return item.type
  }

  return item.highConfidenceMistake ? 'wrong_high_conf' : 'wrong'
}

const normalizeQueueItem = (item: RedemptionQueueItem): RedemptionQueueItem => {
  const type = inferTypeFromLegacyItem(item)

  return {
    ...item,
    challengeId: normalizeChallengeId(item.challengeId),
    type,
    reason: item.reason || REDEMPTION_REASON_BY_TYPE[type],
    highConfidenceMistake: type === 'wrong_high_conf',
  }
}

const resolveAnswerType = (answer: SessionAnswer): RedemptionItemType | null => {
  if (!answer.isCorrect) {
    return answer.confidence >= 4 ? 'wrong_high_conf' : 'wrong'
  }

  if (answer.confidence <= 2) {
    return 'low_conf_correct'
  }

  return null
}

export const getRedemptionQueue = () =>
  storage.get<RedemptionQueueItem[]>(REDEMPTION_QUEUE_KEY, []).map(normalizeQueueItem)

export const setRedemptionQueue = (items: RedemptionQueueItem[]) => {
  storage.set(
    REDEMPTION_QUEUE_KEY,
    items.map((item) => ({
      ...item,
      challengeId: normalizeChallengeId(item.challengeId),
    })),
  )
}

export const upsertMistakesToRedemption = (
  challenge: Challenge,
  answers: SessionAnswer[],
): RedemptionQueueItem[] => {
  const existing = getRedemptionQueue()
  const byKey = new Map(existing.map((item) => [`${item.challengeId}:${item.questionId}`, item]))
  const addedOrUpdated: RedemptionQueueItem[] = []

  let lowConfidenceCorrectAdded = 0

  answers.forEach((answer) => {
    const answerType = resolveAnswerType(answer)
    if (!answerType) {
      return
    }

    const questionData = challenge.questions.find((q) => q.id === answer.questionId)
    if (!questionData) {
      return
    }

    const key = `${challenge.id}:${answer.questionId}`
    const existingItem = byKey.get(key)

    if (
      answerType === 'low_conf_correct' &&
      !existingItem &&
      lowConfidenceCorrectAdded >= LOW_CONFIDENCE_LIMIT_PER_SESSION
    ) {
      return
    }

    const isIncorrect = !answer.isCorrect
    const next: RedemptionQueueItem = {
      questionId: answer.questionId,
      challengeId: challenge.id,
      questionData,
      timesMissed: (existingItem?.timesMissed ?? 0) + (isIncorrect ? 1 : 0),
      lastMissedAt: new Date().toISOString(),
      type: answerType,
      reason: REDEMPTION_REASON_BY_TYPE[answerType],
      highConfidenceMistake: answerType === 'wrong_high_conf',
    }

    byKey.set(key, next)
    addedOrUpdated.push(next)

    if (answerType === 'low_conf_correct' && !existingItem) {
      lowConfidenceCorrectAdded += 1
    }
  })

  const merged = sortRedemptionQueue(Array.from(byKey.values())).slice(0, MAX_REDEMPTION_ITEMS)
  setRedemptionQueue(merged)
  return addedOrUpdated
}

export const removeRedemptionItems = (itemsToRemove: RedemptionQueueItem[]) => {
  if (itemsToRemove.length === 0) {
    return
  }

  const removeSet = new Set(itemsToRemove.map((item) => `${item.challengeId}:${item.questionId}`))
  const next = getRedemptionQueue().filter(
    (item) => !removeSet.has(`${item.challengeId}:${item.questionId}`),
  )
  setRedemptionQueue(next)
}

export const removeSingleRedemptionItem = (item: RedemptionQueueItem) => {
  const next = getRedemptionQueue().filter(
    (current) =>
      !(current.challengeId === item.challengeId && current.questionId === item.questionId),
  )
  setRedemptionQueue(next)
}

export const sortRedemptionQueue = (items: RedemptionQueueItem[]) =>
  [...items]
    .map(normalizeQueueItem)
    .sort((a, b) => {
      const aPriority = REDEMPTION_PRIORITY_BY_TYPE[inferTypeFromLegacyItem(a)]
      const bPriority = REDEMPTION_PRIORITY_BY_TYPE[inferTypeFromLegacyItem(b)]
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      if (a.timesMissed !== b.timesMissed) {
        return b.timesMissed - a.timesMissed
      }
      return new Date(b.lastMissedAt).getTime() - new Date(a.lastMissedAt).getTime()
    })

export const toQuestionList = (items: RedemptionQueueItem[]): QuizQuestion[] =>
  items.map((item) => item.questionData)

// ============================================================================
// Backend-aware redemption functions (with localStorage fallback)
// ============================================================================

export const BACKEND_REDEMPTION_KEY = 'lia-redemption-migrated'

/**
 * Check whether redemption persistence should use the backend path.
 */
export const isRedemptionBackendEnabled = (): boolean => {
  return storage.get<boolean>(BACKEND_REDEMPTION_KEY, false)
}

/**
 * Mark backend redemption as enabled.
 */
export const enableBackendRedemption = () => {
  storage.set(BACKEND_REDEMPTION_KEY, true)
}

/**
 * Get redemption queue with backend support.
 * Tries backend first, falls back to localStorage.
 */
export const getRedemptionQueueWithBackend = async (userId: string): Promise<RedemptionQueueItem[]> => {
  if (!userId) {
    return getRedemptionQueue()
  }

  try {
    const { loadRedemptionQueue } = await import('../lib/redemption')
    return await loadRedemptionQueue(userId)
  } catch (error) {
    console.warn('Backend redemption load failed, using localStorage:', error)
    return getRedemptionQueue()
  }
}

/**
 * Upsert mistakes with backend support.
 * Writes to both localStorage and backend.
 */
export const upsertMistakesToRedemptionWithBackend = async (
  userId: string,
  challenge: Challenge,
  answers: SessionAnswer[],
): Promise<RedemptionQueueItem[]> => {
  const localResult = upsertMistakesToRedemption(challenge, answers)

  if (!userId) {
    return localResult
  }

  try {
    const { upsertRedemptionItems } = await import('../lib/redemption')
    const questionMap = new Map(challenge.questions.map((q) => [q.id, q]))
    await upsertRedemptionItems(userId, challenge.id, answers, questionMap)
  } catch (error) {
    console.warn('Backend redemption upsert failed:', error)
  }

  return localResult
}

/**
 * Remove redemption items with backend support.
 */
export const removeRedemptionItemsWithBackend = async (
  userId: string,
  itemsToRemove: RedemptionQueueItem[],
): Promise<void> => {
  removeRedemptionItems(itemsToRemove)

  if (!userId) {
    return
  }

  try {
    const { removeRedemptionItems: backendRemove } = await import('../lib/redemption')
    await backendRemove(userId, itemsToRemove)
  } catch (error) {
    console.warn('Backend redemption removal failed:', error)
  }
}

/**
 * Remove a single redemption item with backend support.
 */
export const removeSingleRedemptionItemWithBackend = async (
  userId: string,
  item: RedemptionQueueItem,
): Promise<void> => {
  removeSingleRedemptionItem(item)

  if (!userId) {
    return
  }

  try {
    const { removeSingleRedemptionItem: backendRemove } = await import('../lib/redemption')
    await backendRemove(userId, item)
  } catch (error) {
    console.warn('Backend redemption item removal failed:', error)
  }
}
