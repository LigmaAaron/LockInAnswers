/**
 * Shared backend data-access layer for redemption items
 * Handles missed question queue with Supabase persistence
 */

import type { RedemptionItemDB, RedemptionItemType, RedemptionQueueItem, SessionAnswer, QuizQuestion } from '../types/models'
import { questionFromDb } from '../types/models'
import { supabase } from './supabase'

export const LOW_CONFIDENCE_LIMIT_PER_SESSION = 3
export const MAX_REDEMPTION_ITEMS = 75

const REDEMPTION_REASON_BY_TYPE: Record<RedemptionItemType, string> = {
  wrong_high_conf: 'You were confident but wrong',
  wrong: 'You got this wrong',
  low_conf_correct: "You weren't sure about this",
}
const CHALLENGE_QUESTION_COLUMNS = `
  id,
  challenge_id,
  question_order,
  question_text,
  question_type,
  choices,
  correct_answers,
  explanation,
  created_at,
  updated_at
`

/**
 * Determine redemption type from answer
 */
function resolveAnswerType(answer: SessionAnswer): RedemptionItemType | null {
  if (!answer.isCorrect) {
    return answer.confidence >= 4 ? 'wrong_high_conf' : 'wrong'
  }

  if (answer.confidence <= 2) {
    return 'low_conf_correct'
  }

  return null
}

/**
 * Convert DB redemption item to app format
 * Note: question data should be fetched separately and attached
 */
function redemptionFromDb(db: RedemptionItemDB, questionData?: QuizQuestion): RedemptionQueueItem {
  return {
    questionId: db.question_id,
    challengeId: db.challenge_id,
    questionData: questionData || { id: db.question_id, prompt: '', options: [], correctAnswers: [0], correctIndex: 0 },
    timesMissed: db.times_missed,
    lastMissedAt: db.last_missed_at,
    type: db.type,
    reason: REDEMPTION_REASON_BY_TYPE[db.type],
    highConfidenceMistake: db.high_confidence_mistake,
  }
}

/**
 * Load redemption queue for a user with full question data
 */
export async function loadRedemptionQueue(userId: string): Promise<RedemptionQueueItem[]> {
  const { data, error } = await supabase
    .from('redemption_items')
    .select(
      `
      *,
      challenge_questions (${CHALLENGE_QUESTION_COLUMNS})
    `,
    )
    .eq('user_id', userId)
    .order('type', { ascending: false })
    .order('times_missed', { ascending: false })
    .order('last_missed_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to load redemption queue: ${error.message}`)
  }

  return (data || []).map((item) => {
    const questionData = item.challenge_questions
      ? questionFromDb(item.challenge_questions)
      : undefined
    return redemptionFromDb(item, questionData)
  })
}

/**
 * Upsert redemption items from a completed challenge attempt
 */
export async function upsertRedemptionItems(
  userId: string,
  challengeId: string,
  answers: SessionAnswer[],
  questionDataMap: Map<string, QuizQuestion>,
): Promise<RedemptionQueueItem[]> {
  const addedOrUpdated: RedemptionQueueItem[] = []
  let lowConfidenceCorrectAdded = 0

  // Get current queue to check existing items
  const { data: existing } = await supabase
    .from('redemption_items')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)

  const existingMap = new Map((existing || []).map((item) => [`${item.question_id}`, item]))

  // Process each answer
  for (const answer of answers) {
    const answerType = resolveAnswerType(answer)
    if (!answerType) {
      continue
    }

    const questionData = questionDataMap.get(answer.questionId)
    if (!questionData) {
      continue
    }

    // Skip low_conf_correct if already at limit
    if (answerType === 'low_conf_correct' && !existingMap.has(answer.questionId)) {
      if (lowConfidenceCorrectAdded >= LOW_CONFIDENCE_LIMIT_PER_SESSION) {
        continue
      }
      lowConfidenceCorrectAdded += 1
    }

    const existingItem = existingMap.get(answer.questionId)
    const timesMissedIncrement = !answer.isCorrect ? 1 : 0
    const newTimesMissed = (existingItem?.times_missed ?? 0) + timesMissedIncrement

    const redemptionId = existingItem?.id || `redemption-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const now = new Date().toISOString()

    // Upsert redemption item
    const { data: upserted, error } = await supabase
      .from('redemption_items')
      .upsert(
        {
          id: redemptionId,
          user_id: userId,
          question_id: answer.questionId,
          challenge_id: challengeId,
          type: answerType,
          times_missed: newTimesMissed,
          high_confidence_mistake: answerType === 'wrong_high_conf',
          last_missed_at: !answer.isCorrect ? now : existingItem?.last_missed_at || now,
          updated_at: now,
        },
        {
          onConflict: 'user_id,question_id,challenge_id',
        },
      )
      .select()
      .single()

    if (error) {
      console.error(`Failed to upsert redemption item: ${error.message}`)
      continue
    }

    addedOrUpdated.push(redemptionFromDb(upserted, questionData))
    existingMap.set(answer.questionId, upserted)
  }

  // Trim queue if exceeds max
  const { data: allItems } = await supabase
    .from('redemption_items')
    .select('*')
    .eq('user_id', userId)
    .order('type', { ascending: false })
    .order('times_missed', { ascending: false })
    .order('last_missed_at', { ascending: false })

  if ((allItems || []).length > MAX_REDEMPTION_ITEMS) {
    const toRemove = (allItems || []).slice(MAX_REDEMPTION_ITEMS)
    const toRemoveIds = toRemove.map((item) => item.id)

    // Remove excess items
    if (toRemoveIds.length > 0) {
      await supabase.from('redemption_items').delete().in('id', toRemoveIds)
    }
  }

  return addedOrUpdated
}

/**
 * Remove completed redemption items (when user succeeds on a redemption question)
 */
export async function removeRedemptionItems(
  userId: string,
  itemsToRemove: RedemptionQueueItem[],
): Promise<void> {
  if (itemsToRemove.length === 0) {
    return
  }

  // Remove by user_id + question_id + challenge_id
  for (const item of itemsToRemove) {
    const { error } = await supabase
      .from('redemption_items')
      .delete()
      .eq('user_id', userId)
      .eq('question_id', item.questionId)
      .eq('challenge_id', item.challengeId)

    if (error) {
      console.error(`Failed to remove redemption item: ${error.message}`)
    }
  }
}

/**
 * Remove a single redemption item
 */
export async function removeSingleRedemptionItem(
  userId: string,
  item: RedemptionQueueItem,
): Promise<void> {
  const { error } = await supabase
    .from('redemption_items')
    .delete()
    .eq('user_id', userId)
    .eq('question_id', item.questionId)
    .eq('challenge_id', item.challengeId)

  if (error) {
    throw new Error(`Failed to remove redemption item: ${error.message}`)
  }
}

/**
 * Get count of redemption items for a user
 */
export async function getRedemptionItemCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('redemption_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to get redemption count: ${error.message}`)
  }

  return count || 0
}
