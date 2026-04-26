/**
 * Shared backend data-access layer for challenges
 * Handles all challenge CRUD operations with Supabase
 */

import type {
  ChallengeDB,
  Challenge,
  ChallengeStatus,
  QuizQuestion,
  TimerDurationSeconds,
} from '../types/models'
import { questionFromDb, questionToDb } from '../types/models'
import { supabase } from './supabase'
import { isUuid } from '../utils/challengeIdentity'
import { calculateEstimatedMinutes, calculateQuestionCount } from '../utils/challengeEstimation'
import { makeId, storage } from '../utils/storage'

const CHALLENGES_STORAGE_KEY = 'lia-challenges'
const CHALLENGE_MIGRATION_KEY = 'lia-challenges-migrated'
const CHALLENGE_COLUMNS = `
  id,
  creator_id,
  title,
  description,
  cover_url,
  status,
  mode,
  timer_enabled,
  timer_seconds,
  leaderboard_enabled,
  comments_enabled,
  confidence_enabled,
  track_mistakes_for_redemption,
  estimated_minutes,
  question_count,
  is_verified,
  verified_by,
  verified_at,
  created_at,
  updated_at
`
const QUESTION_COLUMNS = `
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
const CHALLENGE_WITH_QUESTIONS_COLUMNS = `${CHALLENGE_COLUMNS}, challenge_questions (${QUESTION_COLUMNS})`

type CreatorProfileRow = {
  id: string
  username: string
}

async function fetchCreatorProfilesMap(creatorIds: string[]) {
  const uniqueIds = Array.from(new Set(creatorIds.filter(Boolean)))
  const profileMap = new Map<string, CreatorProfileRow>()

  if (uniqueIds.length === 0) {
    return profileMap
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`Failed to load creator profiles: ${error.message}`)
  }

  for (const row of data || []) {
    profileMap.set(row.id, row)
  }

  return profileMap
}

function isChallengeVerified(challenge: Pick<Challenge, 'is_verified' | 'isVerified'>) {
  return (challenge.is_verified ?? challenge.isVerified) === true
}

/**
 * Convert DB challenge to app Challenge format
 */
function challengeFromDb(
  db: ChallengeDB,
  questions: QuizQuestion[] = [],
  creatorProfile?: CreatorProfileRow,
): Challenge {
  const is_verified = db.is_verified

  return {
    id: db.id,
    title: db.title,
    description: db.description,
    creatorUsername: creatorProfile?.username,
    creatorAvatarUrl: null,
    questionCount: db.question_count,
    estimatedMinutes: db.estimated_minutes ?? 1,
    createdBy: db.creator_id,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    status: db.status,
    mode: db.mode,
    is_verified,
    verified_by: db.verified_by,
    verified_at: db.verified_at,
    isVerified: is_verified,
    coverUrl: db.cover_url,
    settings: {
      timer: db.timer_enabled,
      leaderboard: db.leaderboard_enabled,
      timerSeconds: db.timer_seconds as TimerDurationSeconds,
    },
    commentsEnabled: db.comments_enabled,
    confidenceEnabled: db.confidence_enabled,
    trackMistakesForRedemption: db.track_mistakes_for_redemption,
    questions,
  }
}

type ChallengeWritePayload = {
  id?: string
  title: string
  description: string
  questions: QuizQuestion[]
  mode: Challenge['mode']
  settings: Challenge['settings']
  trackMistakesForRedemption: boolean
  status: ChallengeStatus
}

function readLegacyChallenges(): Challenge[] {
  const saved = storage.get<Record<string, Challenge> | Challenge[]>(CHALLENGES_STORAGE_KEY, {})

  if (Array.isArray(saved)) {
    return saved
  }

  return Object.values(saved)
}

function ensureChallengeId(id?: string) {
  if (id && isUuid(id)) {
    return id
  }

  return makeId()
}

export function hasPendingLegacyChallengeMigration() {
  return !storage.get<boolean>(CHALLENGE_MIGRATION_KEY, false)
}

export function markLegacyChallengeMigrationComplete() {
  storage.set(CHALLENGE_MIGRATION_KEY, true)
}

export function clearLegacyChallengeStorage() {
  localStorage.removeItem(CHALLENGES_STORAGE_KEY)
}

export async function createChallengeRecord(creatorId: string, payload: ChallengeWritePayload): Promise<Challenge> {
  const id = ensureChallengeId(payload.id)
  const now = new Date().toISOString()
  const questionCount = calculateQuestionCount(payload.questions)
  const estimatedMinutes = calculateEstimatedMinutes(payload.questions)

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      id,
      creator_id: creatorId,
      title: payload.title,
      description: payload.description,
      cover_url: null,
      status: payload.status,
      mode: payload.mode,
      question_count: questionCount,
      estimated_minutes: estimatedMinutes,
      timer_enabled: payload.settings.timer,
      timer_seconds: payload.settings.timerSeconds,
      leaderboard_enabled: payload.settings.leaderboard,
      comments_enabled: false,
      confidence_enabled: false,
      track_mistakes_for_redemption: payload.trackMistakesForRedemption,
      is_verified: false,
      verified_by: null,
      verified_at: null,
      created_at: now,
      updated_at: now,
    })
    .select(CHALLENGE_COLUMNS)

  if (error) {
    throw new Error(`Failed to create challenge: ${error.message}`)
  }

  if (!data || data.length !== 1) {
    throw new Error(`Failed to create challenge: expected one inserted row, received ${data?.length ?? 0}.`)
  }

  if (payload.questions.length > 0) {
    const questionRows = payload.questions.map((question, index) => questionToDb(question, id, index))
    console.log('[challenge-questions] create insert payload', {
      challengeId: id,
      challengeIdIsUuid: isUuid(id),
      questionTypes: questionRows.map((row) => row.question_type),
      includesIdField: questionRows.some((row) => Object.prototype.hasOwnProperty.call(row, 'id')),
      rows: questionRows,
    })
    const { error: questionsError } = await supabase.from('challenge_questions').insert(questionRows)

    if (questionsError) {
      await supabase.from('challenges').delete().eq('id', id)
      throw new Error(`Failed to create challenge questions: ${questionsError.message}`)
    }
  }

  const { data: questions, error: questionsError } = await supabase
    .from('challenge_questions')
    .select(QUESTION_COLUMNS)
    .eq('challenge_id', id)
    .order('question_order', { ascending: true })

  if (questionsError) {
    throw new Error(`Challenge creation succeeded, but loading questions failed: ${questionsError.message}`)
  }

  const creatorProfilesMap = await fetchCreatorProfilesMap([creatorId])
  return challengeFromDb(data[0], (questions || []).map(questionFromDb), creatorProfilesMap.get(creatorId))
}

export async function updateChallengeRecord(
  challengeId: string,
  creatorId: string,
  payload: Partial<Omit<ChallengeWritePayload, 'id'>>,
): Promise<Challenge | null> {
  const now = new Date().toISOString()

  const { data: currentRows, error: currentError } = await supabase
    .from('challenges')
    .select(CHALLENGE_COLUMNS)
    .eq('id', challengeId)
    .eq('creator_id', creatorId)

  if (currentError) {
    throw new Error(`Failed to load challenge for update: ${currentError.message}`)
  }

  if (!currentRows || currentRows.length === 0) {
    return null
  }

  if (currentRows.length > 1) {
    throw new Error(`Expected one challenge row for id ${challengeId}, received ${currentRows.length}.`)
  }

  const current = currentRows[0]
  const { data: currentQuestionRows, error: currentQuestionsError } = await supabase
    .from('challenge_questions')
    .select(QUESTION_COLUMNS)
    .eq('challenge_id', challengeId)
    .order('question_order', { ascending: true })

  if (currentQuestionsError) {
    throw new Error(`Failed to load challenge questions for update: ${currentQuestionsError.message}`)
  }

  const nextQuestions = payload.questions ?? (currentQuestionRows || []).map(questionFromDb)
  const questionCount = calculateQuestionCount(nextQuestions)
  const estimatedMinutes = calculateEstimatedMinutes(nextQuestions)

  const { data: updatedRows, error: updateError } = await supabase
    .from('challenges')
    .update({
      title: payload.title ?? current.title,
      description: payload.description ?? current.description,
      cover_url: current.cover_url,
      mode: payload.mode ?? current.mode,
      status: payload.status ?? current.status,
      question_count: questionCount,
      estimated_minutes: estimatedMinutes,
      timer_enabled: payload.settings?.timer ?? current.timer_enabled,
      timer_seconds: payload.settings?.timerSeconds ?? current.timer_seconds,
      leaderboard_enabled: payload.settings?.leaderboard ?? current.leaderboard_enabled,
      comments_enabled: current.comments_enabled,
      confidence_enabled: current.confidence_enabled,
      track_mistakes_for_redemption:
        payload.trackMistakesForRedemption ?? current.track_mistakes_for_redemption,
      updated_at: now,
    })
    .eq('id', challengeId)
    .eq('creator_id', creatorId)
    .select(CHALLENGE_COLUMNS)

  if (updateError) {
    throw new Error(`Failed to update challenge: ${updateError.message}`)
  }

  if (!updatedRows || updatedRows.length !== 1) {
    throw new Error(`Failed to update challenge: expected one row, received ${updatedRows?.length ?? 0}.`)
  }

  const updated = updatedRows[0]

  if (payload.questions) {
    await supabase.from('challenge_questions').delete().eq('challenge_id', challengeId)

    const questionRows = payload.questions.map((question, index) => questionToDb(question, challengeId, index))
    console.log('[challenge-questions] update insert payload', {
      challengeId,
      challengeIdIsUuid: isUuid(challengeId),
      questionTypes: questionRows.map((row) => row.question_type),
      includesIdField: questionRows.some((row) => Object.prototype.hasOwnProperty.call(row, 'id')),
      rows: questionRows,
    })
    const { error: questionsError } = await supabase.from('challenge_questions').insert(questionRows)

    if (questionsError) {
      throw new Error(`Failed to update challenge questions: ${questionsError.message}`)
    }
  }

  const { data: questions, error: questionsError } = await supabase
    .from('challenge_questions')
    .select(QUESTION_COLUMNS)
    .eq('challenge_id', challengeId)
    .order('question_order', { ascending: true })

  if (questionsError) {
    throw new Error(`Challenge update succeeded, but loading questions failed: ${questionsError.message}`)
  }

  const creatorProfilesMap = await fetchCreatorProfilesMap([creatorId])
  return challengeFromDb(updated, (questions || []).map(questionFromDb), creatorProfilesMap.get(creatorId))
}

/**
 * Save a new draft challenge to Supabase
 */
export async function saveDraft(
  creatorId: string,
  draft: Omit<Challenge, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isVerified' | 'is_verified' | 'verified_by' | 'verified_at'> & { id?: string },
): Promise<Challenge> {
  return createChallengeRecord(creatorId, {
    ...draft,
    status: 'draft',
  })
}

/**
 * Update an existing draft challenge
 */
export async function updateDraft(
  challengeId: string,
  creatorId: string,
  updates: Partial<Omit<Challenge, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'>>,
): Promise<Challenge | null> {
  return updateChallengeRecord(challengeId, creatorId, {
    ...updates,
    status: 'draft',
  })
}

/**
 * Publish a draft challenge (change status to published)
 */
export async function publishChallenge(
  challengeId: string,
  creatorId: string,
): Promise<Challenge | null> {
  return updateChallengeRecord(challengeId, creatorId, { status: 'published' })
}

export async function migrateLegacyChallengesToSupabase(creatorId: string, legacyChallenges?: Challenge[]): Promise<Challenge[]> {
  const sourceChallenges = [...readLegacyChallenges(), ...(legacyChallenges ?? [])]

  if (sourceChallenges.length === 0) {
    return []
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('challenges')
    .select('id')
    .or(`creator_id.eq.${creatorId},status.eq.published`)

  if (existingError) {
    throw new Error(`Failed to inspect existing challenges before migration: ${existingError.message}`)
  }

  const existingIds = new Set((existingRows || []).map((row) => row.id))
  const migrated: Challenge[] = []

  for (const challenge of sourceChallenges) {
    const targetId = isUuid(challenge.id) ? challenge.id : makeId()

    if (existingIds.has(targetId)) {
      continue
    }

    const created = await createChallengeRecord(creatorId, {
      id: targetId,
      title: challenge.title,
      description: challenge.description,
      questions: challenge.questions,
      mode: challenge.mode,
      settings: challenge.settings,
      trackMistakesForRedemption: challenge.trackMistakesForRedemption,
      status: challenge.status,
    })

    migrated.push(created)
    existingIds.add(created.id)
  }

  markLegacyChallengeMigrationComplete()
  clearLegacyChallengeStorage()

  return migrated
}

export async function setChallengeVerification(
  challengeId: string,
  shouldVerify: boolean,
): Promise<Challenge> {
  if (!isUuid(challengeId)) {
    throw new Error('Only database-backed challenges with UUID ids can be verified.')
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user || !isUuid(user.id)) {
    throw new Error('Unable to resolve authenticated admin user UUID for verification.')
  }

  const timestamp = shouldVerify ? new Date().toISOString() : null
  const verifiedBy = shouldVerify ? user.id : null

  console.log('[challenge-verification] update payload', {
    challengeId,
    userId: user.id,
    payload: {
      is_verified: shouldVerify,
      verified_by: verifiedBy,
      verified_at: timestamp,
    },
  })

  const { data: updatedRows, error } = await supabase
    .from('challenges')
    .update({
      is_verified: shouldVerify,
      verified_by: verifiedBy,
      verified_at: timestamp,
    })
    .eq('id', challengeId)
    .select(CHALLENGE_COLUMNS)

  console.log('[challenge-verification] update response', {
    challengeId,
    userId: user.id,
    rowCount: updatedRows?.length ?? 0,
    rows: updatedRows,
    error,
  })

  if (error) {
    throw new Error(`Failed to ${shouldVerify ? 'verify' : 'unverify'} challenge: ${error.message}`)
  }

  if (!updatedRows || updatedRows.length === 0) {
    throw new Error(
      `Failed to ${shouldVerify ? 'verify' : 'unverify'} challenge: no challenge row updated for id ${challengeId}.`,
    )
  }

  if (updatedRows.length > 1) {
    throw new Error(
      `Failed to ${shouldVerify ? 'verify' : 'unverify'} challenge: multiple challenge rows updated for id ${challengeId}.`,
    )
  }

  const updated = updatedRows[0]

  const { data: questions, error: questionsError } = await supabase
    .from('challenge_questions')
    .select(QUESTION_COLUMNS)
    .eq('challenge_id', challengeId)
    .order('question_order', { ascending: true })

  if (questionsError) {
    throw new Error(
      `Verification update succeeded, but loading challenge questions failed: ${questionsError.message}`,
    )
  }

  const mappedQuestions = (questions || []).map(questionFromDb)
  const mapped = challengeFromDb(updated, mappedQuestions)

  const creatorProfilesMap = await fetchCreatorProfilesMap([updated.creator_id])
  const creatorProfile = creatorProfilesMap.get(updated.creator_id)

  return {
    ...mapped,
    creatorUsername: creatorProfile?.username,
    isVerified: isChallengeVerified(mapped),
  }
}

/**
 * Fetch all challenges (published + user's drafts)
 */
export async function fetchAllChallenges(userId?: string): Promise<Challenge[]> {
  // For published challenges, no filter needed
  // If userId provided, also fetch that user's drafts
  if (userId) {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        ${CHALLENGE_WITH_QUESTIONS_COLUMNS}
      `)
      .or(`status.eq.published,and(status.eq.draft,creator_id.eq.${userId})`)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch challenges: ${error.message}`)
    }

    const creatorProfilesMap = await fetchCreatorProfilesMap((data || []).map((row) => row.creator_id))

    return (data || []).map((row) => {
      const questions = (row.challenge_questions || []).map(questionFromDb)
      return challengeFromDb(row, questions, creatorProfilesMap.get(row.creator_id))
    })
  } else {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        ${CHALLENGE_WITH_QUESTIONS_COLUMNS}
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch challenges: ${error.message}`)
    }

    const creatorProfilesMap = await fetchCreatorProfilesMap((data || []).map((row) => row.creator_id))

    return (data || []).map((row) => {
      const questions = (row.challenge_questions || []).map(questionFromDb)
      return challengeFromDb(row, questions, creatorProfilesMap.get(row.creator_id))
    })
  }
}

/**
 * Fetch a single challenge with all its questions
 */
export async function fetchChallengeDetail(challengeId: string, userId?: string): Promise<Challenge | null> {
  const { data: challenge, error } = await supabase
    .from('challenges')
    .select(`
      ${CHALLENGE_WITH_QUESTIONS_COLUMNS}
    `)
    .eq('id', challengeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch challenge: ${error.message}`)
  }

  // Check access: published OR user is creator
  if (challenge.status !== 'published' && challenge.creator_id !== userId) {
    return null
  }

  const questions = (challenge.challenge_questions || []).map(questionFromDb)
  const creatorProfilesMap = await fetchCreatorProfilesMap([challenge.creator_id])
  return challengeFromDb(challenge, questions, creatorProfilesMap.get(challenge.creator_id))
}

/**
 * Fetch all drafts created by a user
 */
export async function getCreatorDrafts(creatorId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select(`
      ${CHALLENGE_WITH_QUESTIONS_COLUMNS}
    `)
    .eq('creator_id', creatorId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch drafts: ${error.message}`)
  }

  const creatorProfilesMap = await fetchCreatorProfilesMap((data || []).map((row) => row.creator_id))

  return (data || []).map((row) => {
    const questions = (row.challenge_questions || []).map(questionFromDb)
    return challengeFromDb(row, questions, creatorProfilesMap.get(row.creator_id))
  })
}

/**
 * Fetch published challenges created by a user
 */
export async function getCreatorPublished(creatorId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select(`
      ${CHALLENGE_WITH_QUESTIONS_COLUMNS}
    `)
    .eq('creator_id', creatorId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch published challenges: ${error.message}`)
  }

  const creatorProfilesMap = await fetchCreatorProfilesMap((data || []).map((row) => row.creator_id))

  return (data || []).map((row) => {
    const questions = (row.challenge_questions || []).map(questionFromDb)
    return challengeFromDb(row, questions, creatorProfilesMap.get(row.creator_id))
  })
}

/**
 * Delete a draft challenge
 */
export async function deleteDraft(challengeId: string, creatorId: string): Promise<boolean> {
  const { error } = await supabase
    .from('challenges')
    .delete()
    .eq('id', challengeId)
    .eq('creator_id', creatorId)
    .eq('status', 'draft')

  if (error) {
    throw new Error(`Failed to delete draft: ${error.message}`)
  }

  return true
}
