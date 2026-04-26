/**
 * Shared backend data-access layer for challenge sessions
 * Handles active/in-progress session state
 */

import type { ChallengeSessionDB, CurrentSession, SessionAnswer } from '../types/models'
import { supabase } from './supabase'
import { normalizeChallengeId } from '../utils/challengeIdentity'

/**
 * Convert DB session to app CurrentSession format
 */
function sessionFromDb(db: ChallengeSessionDB): CurrentSession {
  return {
    challengeId: normalizeChallengeId(db.challenge_id),
    currentQuestionIndex: db.current_question_index,
    answersSoFar: db.answers_so_far,
    timestamp: db.updated_at,
  }
}

/**
 * Save or update an active session
 */
export async function saveSession(
  userId: string,
  challengeId: string,
  currentQuestionIndex: number,
  answersSoFar: SessionAnswer[],
  currentScore: number,
  currentStreak: number,
): Promise<CurrentSession> {
  const now = new Date().toISOString()
  const normalizedChallengeId = normalizeChallengeId(challengeId)

  const { data, error } = await supabase
    .from('challenge_sessions')
    .upsert(
      {
        id: `${userId}:${normalizedChallengeId}`,
        user_id: userId,
        challenge_id: normalizedChallengeId,
        current_question_index: currentQuestionIndex,
        answers_so_far: answersSoFar,
        current_score: currentScore,
        current_streak: currentStreak,
        updated_at: now,
      },
      {
        onConflict: 'user_id,challenge_id',
      },
    )
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save session: ${error.message}`)
  }

  return sessionFromDb(data)
}

/**
 * Load an active session for a user and challenge
 */
export async function loadSession(userId: string, challengeId: string): Promise<CurrentSession | null> {
  const normalizedChallengeId = normalizeChallengeId(challengeId)
  const { data, error } = await supabase
    .from('challenge_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('challenge_id', normalizedChallengeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to load session: ${error.message}`)
  }

  return sessionFromDb(data)
}

/**
 * Clear an active session (remove it on completion or restart)
 */
export async function clearSession(userId: string, challengeId: string): Promise<void> {
  const normalizedChallengeId = normalizeChallengeId(challengeId)
  const { error } = await supabase
    .from('challenge_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('challenge_id', normalizedChallengeId)

  if (error) {
    throw new Error(`Failed to clear session: ${error.message}`)
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<CurrentSession[]> {
  const { data, error } = await supabase
    .from('challenge_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch sessions: ${error.message}`)
  }

  return (data || []).map(sessionFromDb)
}
