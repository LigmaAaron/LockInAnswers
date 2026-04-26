import { motion } from 'framer-motion'
import type { AnswerFeedbackType } from '../../utils/answerFeedback'

type AnswerFeedbackProps = {
  type: AnswerFeedbackType
  message: string
  streak: number
  showStreak: boolean
  isStreakMilestone?: boolean
}

const isCorrectType = (type: AnswerFeedbackType) =>
  type === 'correct_high_conf' || type === 'correct_low_conf'

const isWrongType = (type: AnswerFeedbackType) =>
  type === 'wrong_high_conf' || type === 'wrong_low_conf'

export function AnswerFeedback({
  type,
  message,
  streak,
  showStreak,
  isStreakMilestone = false,
}: AnswerFeedbackProps) {
  const correct = isCorrectType(type)
  const wrong = isWrongType(type)

  const containerClass = correct
    ? 'bg-tertiary-container/30 border-tertiary/40 text-on-surface'
    : wrong
      ? 'bg-error-container/40 border-error/40 text-on-surface'
      : 'bg-surface-container-low border-outline-variant/30 text-on-surface'

  const icon = correct ? 'task_alt' : wrong ? 'warning' : 'info'

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      animate={
        correct
          ? { opacity: 1, scale: 1, y: [3, 0, -2] }
          : wrong
            ? { opacity: 1, scale: 1, x: [0, -4, 4, -2, 2, 0] }
            : { opacity: 1, scale: 1 }
      }
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`mt-2 p-4 rounded-lg border ${containerClass}`}
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
        <p className="font-semibold">{message}</p>
      </div>
      {showStreak && (
        <motion.p
          className="mt-2 text-xs font-medium text-on-surface-variant"
          initial={{ opacity: 0.85, scale: 0.98 }}
          animate={isStreakMilestone ? { opacity: 1, scale: [1, 1.06, 1] } : { opacity: 1, scale: 1 }}
          transition={{ duration: isStreakMilestone ? 0.25 : 0.16 }}
        >
          🔥 {streak} in a row
        </motion.p>
      )}
    </motion.section>
  )
}
