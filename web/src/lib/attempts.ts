/**
 * Shared backend data-access layer for challenge attempts
 * Handles completed challenge runs and per-question results
 */

import type { ChallengeAttemptDB, AttemptAnswerDB, ChallengeRun, ChallengeAnswerResult, SessionAnswer } from '../types/models'
import { supabase } from './supabase'

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
 * Save a completed challenge attempt with all its answers
 */
export async function saveAttempt(
  userId: string,
  challengeId: string,
  userName: string,
  challengeTitle: string,
  score: number,
  correct: number,
  total: number,
  averageConfidence: number,
  confidenceAccuracy: number,
  answers: SessionAnswer[],
  answerDetails: Array<{
    questionId: string
    selectedIndex: number
    correctIndex: number
    confidence: number
    isCorrect: boolean
    pointsEarned: number
  }>,
): Promise<string> {
  const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const now = new Date().toISOString()

  // Insert attempt record
  const { error: attemptError } = await supabase.from('challenge_attempts').insert({
    id: attemptId,
    user_id: userId,
    challenge_id: challengeId,
    score,
    correct,
    total,
    average_confidence: averageConfidence,
    confidence_accuracy: confidenceAccuracy,
    completed_at: now,
  })

  if (attemptError) {
    throw new Error(`Failed to save attempt: ${attemptError.message}`)
  }

  // Insert per-question answers
  const answerRows: AttemptAnswerDB[] = answerDetails.map((detail) => ({
    id: `answer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    attempt_id: attemptId,
    question_id: detail.questionId,
    selected_index: detail.selectedIndex,
    correct_index: detail.correctIndex,
    confidence: detail.confidence,
    is_correct: detail.isCorrect,
    points_earned: detail.pointsEarned,
    created_at: now,
  }))

  if (answerRows.length > 0) {
    const { error: answersError } = await supabase.from('attempt_answers').insert(answerRows)

    if (answersError) {
      throw new Error(`Failed to save answers: ${answersError.message}`)
    }
  }

  return attemptId
}

/**
 * Get a user's attempt history for a challenge
 */
export async function getAttemptHistory(
  userId: string,
  challengeId?: string,
  limit: number = 10,
): Promise<ChallengeRun[]> {
  let query = supabase
    .from('challenge_attempts')
    .select(
      `
      *,
      attempt_answers (*),
      challenges (title)
    `,
    )
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (challengeId) {
    query = query.eq('challenge_id', challengeId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch attempt history: ${error.message}`)
  }

  return (data || []).map((attempt) => ({
    id: attempt.id,
    userId: attempt.user_id,
    userName: '', // Would need to fetch from user profile if needed
    challengeId: attempt.challenge_id,
    challengeTitle: attempt.challenges?.title || 'Unknown Challenge',
    score: attempt.score,
    correct: attempt.correct,
    total: attempt.total,
    averageConfidence: attempt.average_confidence,
    confidenceAccuracy: attempt.confidence_accuracy,
    answers: (attempt.attempt_answers || []).map((ans: AttemptAnswerDB): ChallengeAnswerResult => ({
      questionId: ans.question_id,
      prompt: '', // Would need to fetch question data if needed
      options: [],
      correctIndex: ans.correct_index,
      selectedIndex: ans.selected_index,
      confidence: ans.confidence,
      isCorrect: ans.is_correct,
      scoreDelta: ans.points_earned,
      confidenceAligned: ans.confidence <= 3 !== !ans.is_correct, // Simplified check
    })),
    createdAt: attempt.completed_at,
  }))
}

/**
 * Get attempt details with full question data
 */
export async function getAttemptDetail(attemptId: string, userId: string): Promise<ChallengeRun | null> {
  const { data: attempt, error } = await supabase
    .from('challenge_attempts')
    .select(
      `
      *,
      attempt_answers (
        *,
        challenge_questions (${CHALLENGE_QUESTION_COLUMNS})
      ),
      challenges (title)
    `,
    )
    .eq('id', attemptId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch attempt detail: ${error.message}`)
  }

  return {
    id: attempt.id,
    userId: attempt.user_id,
    userName: '',
    challengeId: attempt.challenge_id,
    challengeTitle: attempt.challenges?.title || 'Unknown Challenge',
    score: attempt.score,
    correct: attempt.correct,
    total: attempt.total,
    averageConfidence: attempt.average_confidence,
    confidenceAccuracy: attempt.confidence_accuracy,
    answers: (attempt.attempt_answers || []).map(
      (ans: AttemptAnswerDB & { challenge_questions: any }): ChallengeAnswerResult => ({
        questionId: ans.question_id,
        prompt: ans.challenge_questions?.question_text || '',
        options: ans.challenge_questions?.choices || [],
        correctIndex: ans.correct_index,
        selectedIndex: ans.selected_index,
        confidence: ans.confidence,
        isCorrect: ans.is_correct,
        scoreDelta: ans.points_earned,
        confidenceAligned: ans.confidence <= 3 !== !ans.is_correct,
      }),
    ),
    createdAt: attempt.completed_at,
  }
}
