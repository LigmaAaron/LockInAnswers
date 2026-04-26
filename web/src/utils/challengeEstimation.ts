import type { QuizQuestion } from '../types/models'

export function calculateQuestionCount(questions: QuizQuestion[]) {
  return questions.length
}

export function calculateEstimatedMinutes(questions: QuizQuestion[]) {
  const totalCharacters = questions.reduce((sum, question) => {
    const optionCharacters = question.options.reduce((optionSum, option) => optionSum + option.length, 0)
    return sum + question.prompt.length + optionCharacters
  }, 0)

  return Math.max(1, Math.ceil(totalCharacters / 600))
}
