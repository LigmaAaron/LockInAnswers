import type { CurrentSession } from '../types/models'
import { storage } from './storage'
import { normalizeChallengeId } from './challengeIdentity'

export const CURRENT_SESSION_KEY = 'lia-current-session'
export const BACKEND_SESSION_KEY = 'lia-session-migrated'

export const getCurrentSession = () =>
  (() => {
    const session = storage.get<CurrentSession | null>(CURRENT_SESSION_KEY, null)
    if (!session) {
      return null
    }

    return {
      ...session,
      challengeId: normalizeChallengeId(session.challengeId),
    }
  })()

export const setCurrentSession = (session: CurrentSession) => {
  storage.set(CURRENT_SESSION_KEY, {
    ...session,
    challengeId: normalizeChallengeId(session.challengeId),
  })
}

export const clearCurrentSession = () => {
  localStorage.removeItem(CURRENT_SESSION_KEY)
}

/**
 * Check whether session persistence should use the backend path.
 */
export const isSessionBackendEnabled = (): boolean => {
  return storage.get<boolean>(BACKEND_SESSION_KEY, false)
}

/**
 * Mark backend sessions as enabled.
 */
export const enableBackendSessions = () => {
  storage.set(BACKEND_SESSION_KEY, true)
}

/**
 * Read session from backend first, then localStorage fallback.
 * If `challengeId` is omitted, the most recently updated backend session is used.
 */
export const getCurrentSessionWithFallback = async (
  userId: string,
  challengeId?: string,
): Promise<CurrentSession | null> => {
  if (!userId) {
    return getCurrentSession()
  }

  try {
    const { getUserSessions, loadSession } = await import('../lib/sessions')

    if (challengeId) {
      const backendSession = await loadSession(userId, challengeId)
      if (backendSession) {
        return backendSession
      }
    } else {
      const sessions = await getUserSessions(userId)
      if (sessions.length > 0) {
        return sessions[0] ?? null
      }
    }
  } catch (error) {
    console.warn('Backend session load failed, using localStorage:', error)
  }

  return getCurrentSession()
}

/**
 * Save session to localStorage and backend during migration.
 */
export const setCurrentSessionWithBackend = async (
  userId: string,
  session: CurrentSession,
  currentScore: number,
  currentStreak: number,
) => {
  storage.set(CURRENT_SESSION_KEY, session)

  if (!userId) {
    return
  }

  try {
    const { saveSession } = await import('../lib/sessions')
    await saveSession(
      userId,
      session.challengeId,
      session.currentQuestionIndex,
      session.answersSoFar,
      currentScore,
      currentStreak,
    )
  } catch (error) {
    console.warn('Backend session save failed:', error)
  }
}

/**
 * Clear session from localStorage and backend.
 */
export const clearCurrentSessionWithBackend = async (userId: string, challengeId: string) => {
  localStorage.removeItem(CURRENT_SESSION_KEY)

  if (!userId) {
    return
  }

  try {
    const { clearSession } = await import('../lib/sessions')
    await clearSession(userId, challengeId)
  } catch (error) {
    console.warn('Backend session clear failed:', error)
  }
}
