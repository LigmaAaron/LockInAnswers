export type NavItem = {
  key: string
  label: string
  path: string
  icon: 'home' | 'library' | 'redemption' | 'leaderboards' | 'create' | 'profile' | 'settings'
}

export type UiConfig = {
  brandName: string
  topbarCtaLabel: string
  sidebarItems: NavItem[]
}

export type Profile = {
  id: string
  username: string
  role: 'user' | 'admin'
  has_completed_onboarding: boolean
  privacy: 'public' | 'friends' | 'private'
  vibe: 'chill' | 'competitive' | 'chaos'
  interests: string[]
  show_highlights: boolean
  mute_sound_effects: boolean
  created_at: string
  updated_at: string
}

export type QuizQuestion = {
  id: string
  backendId?: string
  prompt: string
  options: string[]
  correctAnswers?: number[]
  correctIndex?: number
  questionType?: QuestionType
  explanation?: string | null
}

export type TimerDurationSeconds = 5 | 10 | 15

export type ChallengeMode = 'study' | 'competitive' | 'casual'

export type ChallengeStatus = 'draft' | 'published'

export type BackendQuestionType = 'multiple_choice' | 'multi_select'
export type QuestionType =
  | BackendQuestionType
  | 'single_choice'
  | 'multiple-choice'
  | 'multiple choice'
  | 'single'
  | 'multiselect'

export type ChallengeSettings = {
  timer: boolean
  leaderboard: boolean
  timerSeconds: TimerDurationSeconds
}

export type ScoringConfig = {
  rewardByConfidence: [number, number, number, number, number]
  penaltyByConfidence: [number, number, number, number, number]
  suddenDeathEndsRun: boolean
}

export type Challenge = {
  id: string
  title: string
  description: string
  coverUrl?: string | null
  creatorUsername?: string
  creatorAvatarUrl?: string | null
  questionCount: number
  estimatedMinutes: number
  createdBy: string
  createdAt: string
  updatedAt: string
  status: ChallengeStatus
  questions: QuizQuestion[]
  mode: ChallengeMode
  is_verified?: boolean
  verified_by?: string | null
  verified_at?: string | null
  isVerified?: boolean
  commentsEnabled?: boolean
  confidenceEnabled?: boolean
  settings: ChallengeSettings
  trackMistakesForRedemption: boolean
}

export type SessionAnswer = {
  questionId: string
  selectedAnswer: number
  correctAnswer: number
  confidence: number
  isCorrect: boolean
  scoreDelta: number
}

export type CurrentSession = {
  challengeId: string
  currentQuestionIndex: number
  answersSoFar: SessionAnswer[]
  timestamp: string
}

export type RedemptionItemType = 'wrong_high_conf' | 'wrong' | 'low_conf_correct'

export type RedemptionQueueItem = {
  questionId: string
  challengeId: string
  questionData: QuizQuestion
  timesMissed: number
  lastMissedAt: string
  type: RedemptionItemType
  reason: string
  highConfidenceMistake: boolean
}

export type LeaderboardEntry = {
  id: string
  userId: string
  userName: string
  challengeTitle: string
  score: number
  correct: number
  total: number
  averageConfidence?: number
  confidenceAccuracy?: number
  createdAt: string
}

export type ChallengeAnswerResult = {
  questionId: string
  prompt: string
  options: string[]
  correctIndex: number
  selectedIndex: number
  confidence: number
  isCorrect: boolean
  scoreDelta: number
  confidenceAligned: boolean
}

export type ChallengeRun = {
  id: string
  userId: string
  userName: string
  challengeId: string
  challengeTitle: string
  score: number
  correct: number
  total: number
  averageConfidence: number
  confidenceAccuracy: number
  answers: ChallengeAnswerResult[]
  createdAt: string
}

export type MissedQuestion = {
  id: string
  userId: string
  challengeId: string
  challengeTitle: string
  prompt: string
  correctAnswer: string
  guessedAnswer: string
  confidence: number
  createdAt: string
}

// ============================================================================
// Supabase-Backed Types (DB schema)
// ============================================================================

export type ChallengeQuestion = {
  id: string
  challenge_id: string
  question_order: number
  question_text: string
  question_type: BackendQuestionType
  choices: string[]
  correct_answers: number[]
  explanation: string | null
  created_at: string
  updated_at: string
}

export type ChallengeQuestionInsert = {
  challenge_id: string
  question_order: number
  question_text: string
  question_type: BackendQuestionType
  choices: string[]
  correct_answers: number[]
  explanation: string | null
}

export type ChallengeDB = {
  id: string
  creator_id: string
  title: string
  description: string
  cover_url: string | null
  status: ChallengeStatus
  mode: ChallengeMode
  timer_enabled: boolean
  timer_seconds: TimerDurationSeconds | null
  leaderboard_enabled: boolean
  comments_enabled: boolean
  confidence_enabled: boolean
  track_mistakes_for_redemption: boolean
  estimated_minutes: number
  question_count: number
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export type ChallengeDetailDB = ChallengeDB & {
  challenge_questions?: ChallengeQuestion[]
}

export type ChallengeSessionDB = {
  id: string
  user_id: string
  challenge_id: string
  current_question_index: number
  answers_so_far: SessionAnswer[]
  current_score: number
  current_streak: number
  created_at: string
  updated_at: string
}

export type ChallengeAttemptDB = {
  id: string
  user_id: string
  challenge_id: string
  score: number
  correct: number
  total: number
  average_confidence: number
  confidence_accuracy: number
  completed_at: string
}

export type AttemptAnswerDB = {
  id: string
  attempt_id: string
  question_id: string
  selected_index: number
  correct_index: number
  confidence: number
  is_correct: boolean
  points_earned: number
  created_at: string
}

export type RedemptionItemDB = {
  id: string
  user_id: string
  question_id: string
  challenge_id: string
  type: RedemptionItemType
  times_missed: number
  high_confidence_mistake: boolean
  last_missed_at: string
  created_at: string
  updated_at: string
}

// Transformation helpers
export const getQuestionCorrectAnswers = (q: Pick<QuizQuestion, 'correctAnswers' | 'correctIndex'>) => {
  if (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0) {
    return q.correctAnswers
  }

  if (typeof q.correctIndex === 'number' && q.correctIndex >= 0) {
    return [q.correctIndex]
  }

  return [0]
}

export const normalizeQuestionType = (questionType?: QuestionType | string | null): BackendQuestionType => {
  if (!questionType) {
    return 'multiple_choice'
  }

  const normalized = String(questionType).trim().toLowerCase()

  if (
    normalized === 'multi_select'
    || normalized === 'multiselect'
    || normalized === 'multi-select'
  ) {
    return 'multi_select'
  }

  if (
    normalized === 'multiple_choice'
    || normalized === 'multiple choice'
    || normalized === 'multiple-choice'
    || normalized === 'single_choice'
    || normalized === 'single'
  ) {
    return 'multiple_choice'
  }

  return 'multiple_choice'
}

export const getPrimaryCorrectAnswerIndex = (q: Pick<QuizQuestion, 'correctAnswers' | 'correctIndex'>) => {
  const [first] = getQuestionCorrectAnswers(q)
  return typeof first === 'number' ? first : 0
}

export const isQuestionSelectionCorrect = (
  q: Pick<QuizQuestion, 'correctAnswers' | 'correctIndex'>,
  selectedIndex: number,
) => getQuestionCorrectAnswers(q).includes(selectedIndex)

export const questionToDb = (q: QuizQuestion, challenge_id: string, question_order: number): ChallengeQuestionInsert => {
  const correctAnswers = getQuestionCorrectAnswers(q).filter(
    (answerIndex) => Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < q.options.length,
  )

  return {
    challenge_id,
    question_order,
    question_text: q.prompt,
    question_type: normalizeQuestionType(q.questionType),
    choices: q.options,
    correct_answers: correctAnswers.length > 0 ? correctAnswers : [0],
    explanation: q.explanation ?? null,
  }
}

export const questionFromDb = (q: ChallengeQuestion): QuizQuestion => {
  const correctAnswers = Array.isArray(q.correct_answers) && q.correct_answers.length > 0
    ? q.correct_answers
    : [0]

  return {
    id: q.id,
    backendId: q.id,
    prompt: q.question_text,
    options: q.choices,
    correctAnswers,
    correctIndex: correctAnswers[0],
    questionType: normalizeQuestionType(q.question_type),
    explanation: q.explanation,
  }
}
