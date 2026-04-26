export type AnswerFeedbackType =
  | 'correct_high_conf'
  | 'correct_low_conf'
  | 'wrong_high_conf'
  | 'wrong_low_conf'
  | 'neutral'

type ResolveFeedbackInput = {
  isCorrect: boolean
  confidence: number
  currentStreak: number
}

export type AnswerFeedbackPayload = {
  type: AnswerFeedbackType
  message: string
  streak: number
  showStreak: boolean
  isStreakMilestone: boolean
}

const MESSAGE_BY_TYPE: Record<AnswerFeedbackType, string[]> = {
  correct_high_conf: [
    'Locked in. Nice.',
    'Confident and correct.',
    'Sharp read. Keep it rolling.',
    'You called it with confidence.',
  ],
  correct_low_conf: [
    'Good instinct.',
    "You weren't sure, but got it.",
    'Nice recovery call.',
    'Trust that read more often.',
  ],
  wrong_high_conf: [
    'Confident, but not quite.',
    'Close—but rethink this one.',
    'Good conviction, wrong lane.',
    'Bold call. Adjust and move.',
  ],
  wrong_low_conf: [
    'No worries—good learning moment.',
    'You’ll get this next time.',
    'Good miss to learn from.',
    'Reset and take the next one.',
  ],
  neutral: ['Solid.', 'Steady.', 'Clean answer.'],
}

const STREAK_MILESTONES = new Set([5, 10])
const lastMessageByType: Partial<Record<AnswerFeedbackType, string>> = {}

export const getAnswerFeedbackType = (
  isCorrect: boolean,
  confidence: number,
): AnswerFeedbackType => {
  if (confidence === 3) {
    return 'neutral'
  }

  if (isCorrect) {
    return confidence >= 4 ? 'correct_high_conf' : 'correct_low_conf'
  }

  return confidence >= 4 ? 'wrong_high_conf' : 'wrong_low_conf'
}

const pickMessage = (type: AnswerFeedbackType) => {
  const options = MESSAGE_BY_TYPE[type]
  if (!options || options.length === 0) {
    return 'Solid.'
  }

  const previous = lastMessageByType[type]
  const candidates = options.length > 1 && previous
    ? options.filter((line) => line !== previous)
    : options

  const source = candidates.length > 0 ? candidates : options
  const randomIndex = Math.floor(Math.random() * source.length)
  const picked = source[randomIndex] ?? source[0]
  lastMessageByType[type] = picked
  return picked
}

const shouldShowStreak = (streak: number) => streak >= 2 && (streak === 2 || STREAK_MILESTONES.has(streak))

export const resolveAnswerFeedback = ({
  isCorrect,
  confidence,
  currentStreak,
}: ResolveFeedbackInput): AnswerFeedbackPayload => {
  const type = getAnswerFeedbackType(isCorrect, confidence)
  const message = pickMessage(type)

  return {
    type,
    message,
    streak: currentStreak,
    showStreak: shouldShowStreak(currentStreak),
    isStreakMilestone: STREAK_MILESTONES.has(currentStreak),
  }
}
