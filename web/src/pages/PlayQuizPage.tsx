import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AnswerFeedback } from '../components/ui/AnswerFeedback'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { BackButton } from '../components/ui/BackButton'
import { ConfidenceSelector } from '../components/ui/ConfidenceSelector'
import { PromptDialog } from '../components/ui/PromptDialog'
import { SummaryActionButton } from '../components/ui/SummaryActionButton'
import { Toggle } from '../components/ui/Toggle'
import { SummaryStatCard } from '../components/SummaryStatCard'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { useGameplayHud } from '../context/GameplayHudContext'
import { calculateEstimatedMinutes, calculateQuestionCount } from '../utils/challengeEstimation'
import { resolveAnswerFeedback, type AnswerFeedbackPayload } from '../utils/answerFeedback'
import { navigateBackWithLog } from '../utils/navigation'
import {
  preloadFeedbackAudio,
  primeFeedbackAudioFromGesture,
  triggerAnswerEffects,
  triggerChallengeCompletedEffects,
} from '../utils/feedbackEffects'
import { applyScoreDelta, getScoreDelta, getStreakMultiplier } from '../utils/scoring'
import { mergeChallengeSettings } from '../utils/challengeSettings'
import { clearCurrentSession, getCurrentSession, setCurrentSession } from '../utils/session'
import {
  getRedemptionQueue,
  removeRedemptionItems,
  removeSingleRedemptionItem,
  sortRedemptionQueue,
  upsertMistakesToRedemption,
} from '../utils/redemption'
import type { Challenge, CurrentSession, RedemptionQueueItem, SessionAnswer } from '../types/models'
import {
  getPrimaryCorrectAnswerIndex,
  getQuestionCorrectAnswers,
  isQuestionSelectionCorrect,
} from '../types/models'

type ChallengeStepResult = {
  questionId: string
  selectedIndex: number
  correctAnswers: number[]
  confidence: number
  isCorrect: boolean
  scoreDelta: number
}

type RunAnswerDetail = {
  questionId: string
  questionText: string
  selectedAnswer: string
  correctAnswer: string
  confidence: number
  isCorrect: boolean
  pointsEarned: number
}

type ChallengeState = {
  currentQuestionIndex: number
  selectedAnswer: number | null
  confidence: number | null
  score: number
  streak: number
  results: ChallengeStepResult[]
}

const emptyState: ChallengeState = {
  currentQuestionIndex: 0,
  selectedAnswer: null,
  confidence: null,
  score: 0,
  streak: 0,
  results: [],
}

export function PlayQuizPage() {
  const { challengeId } = useParams<{ challengeId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { challenges, recordQuizResult, scoringConfig } = useAppData()
  const { currentUser } = useAuth()
  const { setCurrentScore } = useGameplayHud()
  const isRedemptionRun = challengeId === 'redemption'

  const redemptionQueue = useMemo(
    () => (isRedemptionRun ? sortRedemptionQueue(getRedemptionQueue()) : []),
    [isRedemptionRun],
  )

  const redemptionQueueByQuestionId = useMemo(
    () =>
      new Map(
        redemptionQueue.map((item) => [
          `redemption:${item.challengeId}:${item.questionId}`,
          item,
        ]),
      ),
    [redemptionQueue],
  )

  const redemptionChallenge = useMemo<Challenge | null>(() => {
    if (!isRedemptionRun) {
      return null
    }

    const questions = redemptionQueue.map((item) => ({
      ...item.questionData,
      id: `redemption:${item.challengeId}:${item.questionId}`,
    }))

    return {
      id: 'redemption',
      title: 'Redemption Challenge',
      description: 'Recover missed questions with full challenge flow.',
      questionCount: calculateQuestionCount(questions),
      estimatedMinutes: calculateEstimatedMinutes(questions),
      createdBy: 'LIA',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      status: 'published',
      questions,
      mode: 'study',
      settings: {
        timer: false,
        leaderboard: false,
        timerSeconds: 10,
      },
      trackMistakesForRedemption: false,
    }
  }, [isRedemptionRun, redemptionQueue])

  const challenge = useMemo(
    () => redemptionChallenge ?? challenges.find((item) => item.id === challengeId),
    [challengeId, challenges, redemptionChallenge],
  )
  const settings = useMemo(
    () => mergeChallengeSettings(challenge?.settings),
    [challenge?.settings],
  )

  const [challengeState, setChallengeState] = useState<ChallengeState>(emptyState)
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering')
  const [lastStepResult, setLastStepResult] = useState<ChallengeStepResult | null>(null)
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedbackPayload | null>(null)
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    settings.timer ? settings.timerSeconds : null,
  )
  const [resumePromptOpen, setResumePromptOpen] = useState(false)
  const [pendingSession, setPendingSession] = useState<CurrentSession | null>(null)
  const [redemptionItemsFromRun, setRedemptionItemsFromRun] = useState<RedemptionQueueItem[]>([])
  const [keepInRedemption, setKeepInRedemption] = useState(true)
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)
  const backFallbackPath = isRedemptionRun ? '/redemption' : `/challenge/${challenge?.id ?? ''}`

  const actionSectionRef = useRef<HTMLElement | null>(null)
  const confidenceSectionRef = useRef<HTMLElement | null>(null)

  if (!challenge) {
    return <Navigate to="/home" replace />
  }

  if (isRedemptionRun && challenge.questions.length === 0) {
    return <Navigate to="/redemption" replace />
  }

  const question = challenge.questions[challengeState.currentQuestionIndex]
  const questionPrimaryCorrectIndex = getPrimaryCorrectAnswerIndex(question)
  const challengeQuestionsById = useMemo(
    () => new Map(challenge.questions.map((item) => [item.id, item])),
    [challenge.questions],
  )

  const runAnswerDetails = useMemo<RunAnswerDetail[]>(
    () =>
      challengeState.results.map((entry) => {
        const sourceQuestion = challengeQuestionsById.get(entry.questionId)
        const selectedAnswer =
          entry.selectedIndex >= 0 && sourceQuestion?.options[entry.selectedIndex]
            ? sourceQuestion.options[entry.selectedIndex]
            : 'No answer'
        const correctAnswer = sourceQuestion?.options[entry.correctAnswers[0] ?? 0] ?? 'Unknown'

        return {
          questionId: entry.questionId,
          questionText: sourceQuestion?.prompt ?? 'Unknown question',
          selectedAnswer,
          correctAnswer,
          confidence: entry.confidence,
          isCorrect: entry.isCorrect,
          pointsEarned: entry.scoreDelta,
        }
      }),
    [challengeQuestionsById, challengeState.results],
  )

  const highConfidenceWrong = useMemo(
    () => runAnswerDetails.filter((answer) => !answer.isCorrect && answer.confidence >= 4),
    [runAnswerDetails],
  )

  const lowConfidenceCorrect = useMemo(
    () => runAnswerDetails.filter((answer) => answer.isCorrect && answer.confidence <= 2),
    [runAnswerDetails],
  )

  const bigMistakes = highConfidenceWrong.slice(0, 3)
  const uncertainKnowledge = lowConfidenceCorrect.slice(0, 3)

  const summaryStats = useMemo(() => {
    const total = runAnswerDetails.length
    const correct = runAnswerDetails.filter((answer) => answer.isCorrect).length
    const confidenceSum = runAnswerDetails.reduce((sum, answer) => sum + answer.confidence, 0)
    const confidenceAlignedCount = runAnswerDetails.filter(
      (answer) =>
        (answer.isCorrect && answer.confidence >= 4)
        || (!answer.isCorrect && answer.confidence <= 2),
    ).length

    return {
      total,
      correct,
      accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
      averageConfidence: total > 0 ? confidenceSum / total : 0,
      confidenceAccuracyPercent: total > 0 ? Math.round((confidenceAlignedCount / total) * 100) : 0,
      scoreEarned: runAnswerDetails.reduce((sum, answer) => sum + answer.pointsEarned, 0),
    }
  }, [runAnswerDetails])

  const runInsightSentence = useMemo(() => {
    if (highConfidenceWrong.length >= 2) {
      return 'You were overconfident on a few questions this challenge.'
    }

    if (lowConfidenceCorrect.length >= 3) {
      return 'You knew more than you thought on several questions.'
    }

    if (summaryStats.accuracyPercent >= 85 && summaryStats.averageConfidence >= 4) {
      return 'You looked very locked in this challenge.'
    }

    return 'Your confidence was fairly balanced this challenge.'
  }, [highConfidenceWrong.length, lowConfidenceCorrect.length, summaryStats.accuracyPercent, summaryStats.averageConfidence])

  const isLastQuestion = challengeState.currentQuestionIndex === challenge.questions.length - 1
  const timedOutAnswer = phase === 'feedback' && !!lastStepResult && lastStepResult.selectedIndex < 0
  const canChooseConfidence = challengeState.selectedAnswer !== null && phase === 'answering'
  const hasConfidence = challengeState.confidence !== null
  const potentialGain = hasConfidence
    ? getScoreDelta(true, challengeState.confidence!, scoringConfig)
    : 0
  const potentialLoss = hasConfidence
    ? getScoreDelta(false, challengeState.confidence!, scoringConfig)
    : 0
  const timerPercent = settings.timer && secondsLeft !== null
    ? Math.max(0, Math.min(100, (secondsLeft / settings.timerSeconds) * 100))
    : 0

  const timerProgressColor = (() => {
    const start = { r: 16, g: 185, b: 129 }
    const end = { r: 239, g: 68, b: 68 }
    const t = 1 - timerPercent / 100
    const r = Math.round(start.r + (end.r - start.r) * t)
    const g = Math.round(start.g + (end.g - start.g) * t)
    const b = Math.round(start.b + (end.b - start.b) * t)
    return `rgb(${r}, ${g}, ${b})`
  })()

  useEffect(() => {
    const saved = getCurrentSession()
    if (!saved || saved.challengeId !== challenge.id || saved.answersSoFar.length === 0) {
      return
    }

    setPendingSession(saved)
    setResumePromptOpen(true)
  }, [challenge.id])

  useEffect(() => {
    if (result || resumePromptOpen) {
      return
    }

    const shouldPersistNextIndex = phase === 'feedback' && !!lastStepResult
    const persistedQuestionIndex = shouldPersistNextIndex
      ? Math.min(challengeState.currentQuestionIndex + 1, challenge.questions.length - 1)
      : challengeState.currentQuestionIndex

    const answersSoFar: SessionAnswer[] = challengeState.results.map((entry) => ({
      questionId: entry.questionId,
      selectedAnswer: entry.selectedIndex,
      correctAnswer: entry.correctAnswers[0] ?? 0,
      confidence: entry.confidence,
      isCorrect: entry.isCorrect,
      scoreDelta: entry.scoreDelta,
    }))

    setCurrentSession({
      challengeId: challenge.id,
      currentQuestionIndex: persistedQuestionIndex,
      answersSoFar,
      timestamp: new Date().toISOString(),
    })
  }, [
    challenge.id,
    challenge.questions.length,
    challengeState.currentQuestionIndex,
    challengeState.results,
    phase,
    lastStepResult,
    result,
    resumePromptOpen,
  ])

  useLayoutEffect(() => {
    setCurrentScore(challengeState.score)
  }, [challengeState.score, setCurrentScore])

  useEffect(() => {
    if (!settings.timer || phase !== 'answering') {
      setSecondsLeft(null)
      return
    }

    setSecondsLeft(settings.timerSeconds)
  }, [
    challengeState.currentQuestionIndex,
    phase,
    settings.timer,
    settings.timerSeconds,
  ])

  useEffect(() => {
    if (
      !settings.timer
      || phase !== 'answering'
      || secondsLeft === null
      || resumePromptOpen
      || backConfirmOpen
    ) {
      return
    }

    if (secondsLeft <= 0) {
      const timeoutConfidence = challengeState.confidence ?? 3
      const scoreDelta = getScoreDelta(false, timeoutConfidence, scoringConfig)
      const nextStreak = 0
      const stepResult: ChallengeStepResult = {
        questionId: question.id,
        selectedIndex: challengeState.selectedAnswer ?? -1,
        correctAnswers: getQuestionCorrectAnswers(question),
        confidence: timeoutConfidence,
        isCorrect: false,
        scoreDelta,
      }

      setLastStepResult(stepResult)
      setAnswerFeedback(
        resolveAnswerFeedback({
          isCorrect: false,
          confidence: timeoutConfidence,
          currentStreak: nextStreak,
        }),
      )
      setChallengeState((prev) => ({
        ...prev,
        score: applyScoreDelta(prev.score, scoreDelta),
        streak: nextStreak,
        results: [...prev.results, stepResult],
      }))
      setPhase('feedback')
      triggerAnswerEffects({ isCorrect: false, streak: nextStreak })
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSecondsLeft((prev) => (prev === null ? null : prev - 1))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [
    settings.timer,
    phase,
    secondsLeft,
    challengeState.confidence,
    challengeState.selectedAnswer,
    questionPrimaryCorrectIndex,
    question.id,
    scoringConfig,
    resumePromptOpen,
    backConfirmOpen,
  ])

  useEffect(() => {
    if (phase !== 'feedback' || !lastStepResult) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const actionTop = actionSectionRef.current?.getBoundingClientRect().top
      if (actionTop === undefined) {
        return
      }

      const targetTop = Math.max(0, actionTop + window.scrollY - 24)
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      })
    }, 170)

    return () => window.clearTimeout(timeoutId)
  }, [phase, lastStepResult])

  const resumeSession = () => {
    if (!pendingSession) {
      setResumePromptOpen(false)
      return
    }

    const restoredResults: ChallengeStepResult[] = pendingSession.answersSoFar.map((answer) => ({
      questionId: answer.questionId,
      selectedIndex: answer.selectedAnswer,
      correctAnswers: [answer.correctAnswer],
      confidence: answer.confidence,
      isCorrect: answer.isCorrect,
      scoreDelta: answer.scoreDelta,
    }))

    const score = restoredResults.reduce((sum, item) => sum + item.scoreDelta, 0)
    let streak = 0
    for (let i = restoredResults.length - 1; i >= 0; i -= 1) {
      if (!restoredResults[i]?.isCorrect) {
        break
      }
      streak += 1
    }

    setChallengeState({
      currentQuestionIndex: pendingSession.currentQuestionIndex,
      selectedAnswer: null,
      confidence: null,
      score: Math.max(0, score),
      streak,
      results: restoredResults,
    })
    setPhase('answering')
    setLastStepResult(null)
    setAnswerFeedback(null)
    setResumePromptOpen(false)
    setPendingSession(null)
  }

  const restartSession = () => {
    clearCurrentSession()
    setChallengeState(emptyState)
    setPhase('answering')
    setLastStepResult(null)
    setAnswerFeedback(null)
    setResumePromptOpen(false)
    setPendingSession(null)
  }

  const confirmBackNavigation = () => {
    navigateBackWithLog(navigate, location.pathname, backFallbackPath, {
      skipPathPrefixes: ['/play/'],
    })
    setBackConfirmOpen(false)
  }

  const retryChallenge = () => {
    clearCurrentSession()
    setChallengeState(emptyState)
    setPhase('answering')
    setLastStepResult(null)
    setAnswerFeedback(null)
    setResult(null)
    setRedemptionItemsFromRun([])
    setKeepInRedemption(true)

    window.scrollTo({
      top: 0,
      behavior: 'auto',
    })
  }

  const submit = () => {
    if (challengeState.selectedAnswer === null || challengeState.confidence === null || phase !== 'answering') {
      return
    }

    preloadFeedbackAudio()
    primeFeedbackAudioFromGesture()

    const isCorrect = isQuestionSelectionCorrect(question, challengeState.selectedAnswer)
    const nextStreak = isCorrect ? challengeState.streak + 1 : 0
    const baseScoreDelta = getScoreDelta(isCorrect, challengeState.confidence, scoringConfig)
    const scoreDelta = isCorrect
      ? Math.round(baseScoreDelta * getStreakMultiplier(nextStreak))
      : baseScoreDelta
    const stepResult: ChallengeStepResult = {
      questionId: question.id,
      selectedIndex: challengeState.selectedAnswer,
      correctAnswers: getQuestionCorrectAnswers(question),
      confidence: challengeState.confidence,
      isCorrect,
      scoreDelta,
    }

    setLastStepResult(stepResult)
    setAnswerFeedback(
      resolveAnswerFeedback({
        isCorrect,
        confidence: challengeState.confidence,
        currentStreak: nextStreak,
      }),
    )
    setChallengeState((prev) => ({
      ...prev,
      score: applyScoreDelta(prev.score, scoreDelta),
      streak: nextStreak,
      results: [...prev.results, stepResult],
    }))

    if (isRedemptionRun && isCorrect) {
      const queueItem = redemptionQueueByQuestionId.get(stepResult.questionId)
      if (queueItem) {
        removeSingleRedemptionItem(queueItem)
      }
    }

    setPhase('feedback')
    triggerAnswerEffects({ isCorrect, streak: nextStreak })
  }

  const continueFlow = () => {
    if (result || !lastStepResult || phase !== 'feedback') {
      return
    }

    if (isLastQuestion) {
      if (!currentUser) {
        return
      }

      const answers = challengeState.results.map((answer) => ({
        selectedIndex: answer.selectedIndex,
        confidence: answer.confidence,
        pointsEarned: answer.scoreDelta,
        question: challenge.questions.find((item) => item.id === answer.questionId) ?? question,
      }))

      const computed = recordQuizResult({
        userId: currentUser.id,
        userName: currentUser.username,
        challenge,
        answers,
      })

      if (isRedemptionRun) {
        const usedQueueItems = challengeState.results
          .map((entry) => redemptionQueueByQuestionId.get(entry.questionId))
          .filter((item): item is RedemptionQueueItem => !!item)
        removeRedemptionItems(usedQueueItems)
      }

      if (challenge.trackMistakesForRedemption) {
        const sessionAnswers: SessionAnswer[] = challengeState.results.map((entry) => ({
          questionId: entry.questionId,
          selectedAnswer: entry.selectedIndex,
          correctAnswer: entry.correctAnswers[0] ?? 0,
          confidence: entry.confidence,
          isCorrect: entry.isCorrect,
          scoreDelta: entry.scoreDelta,
        }))
        const queued = upsertMistakesToRedemption(challenge, sessionAnswers)
        setRedemptionItemsFromRun(queued)
      }

      clearCurrentSession()
      triggerChallengeCompletedEffects()
      setResult(computed)
      return
    }

    setChallengeState((prev) => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex + 1,
      selectedAnswer: null,
      confidence: null,
    }))
    setLastStepResult(null)
    setAnswerFeedback(null)
    setPhase('answering')

    window.scrollTo({
      top: 0,
      behavior: 'auto',
    })
  }

  const selectAnswer = (selectedIndex: number) => {
    if (phase !== 'answering') {
      return
    }

    preloadFeedbackAudio()
    primeFeedbackAudioFromGesture()

    setChallengeState((prev) => ({
      ...prev,
      selectedAnswer: selectedIndex,
      confidence: prev.confidence ?? 3,
    }))

    window.setTimeout(() => {
      const confidenceTop = confidenceSectionRef.current?.getBoundingClientRect().top
      if (confidenceTop === undefined) {
        return
      }

      const targetTop = Math.max(0, confidenceTop + window.scrollY - 16)
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      })
    }, 180)
  }

  const removeQueuedMistakes = () => {
    removeRedemptionItems(redemptionItemsFromRun)
    setRedemptionItemsFromRun([])
  }

  const restoreQueuedMistakes = () => {
    if (!challenge.trackMistakesForRedemption) {
      return
    }

    const sessionAnswers: SessionAnswer[] = challengeState.results.map((entry) => ({
      questionId: entry.questionId,
      selectedAnswer: entry.selectedIndex,
      correctAnswer: entry.correctAnswers[0] ?? 0,
      confidence: entry.confidence,
      isCorrect: entry.isCorrect,
      scoreDelta: entry.scoreDelta,
    }))
    const queued = upsertMistakesToRedemption(challenge, sessionAnswers)
    setRedemptionItemsFromRun(queued)
  }

  const handleRedemptionToggle = (checked: boolean) => {
    setKeepInRedemption(checked)

    if (checked) {
      restoreQueuedMistakes()
      return
    }

    removeQueuedMistakes()
  }

  if (result) {
    return (
      <div className="flex-grow pt-12 pb-12 px-6 max-w-4xl mx-auto w-full flex flex-col gap-8 items-center justify-center min-h-[60vh]">
        <BackButton fallbackPath={backFallbackPath} className="self-start" onClick={() => setBackConfirmOpen(true)} />
        <PromptDialog
          open={backConfirmOpen}
          title="Leave this challenge?"
          description="Your result is saved, but this will take you back to the previous page."
        >
          <AnimatedButton
            type="button"
            onClick={() => setBackConfirmOpen(false)}
            variant="secondary"
            className="px-4 py-2 font-medium"
          >
            Stay
          </AnimatedButton>
          <AnimatedButton
            type="button"
            onClick={confirmBackNavigation}
            className="px-4 py-2 font-semibold"
          >
            Leave
          </AnimatedButton>
        </PromptDialog>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-surface-container p-6 md:p-8 rounded-lg shadow-none w-full max-w-3xl"
        >
          <div className="text-center space-y-2">
            <span className="material-symbols-outlined text-6xl text-primary">workspace_premium</span>
            <h2 className="text-3xl font-bold">Challenge Summary</h2>
            <p className="text-sm text-on-surface-variant">{challenge.title}</p>
            <p className="text-base font-medium text-on-surface max-w-2xl mx-auto">{runInsightSentence}</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:gap-4 text-left">
            <SummaryStatCard
              label="Accuracy"
              value={`${summaryStats.correct} / ${summaryStats.total} (${summaryStats.accuracyPercent}%)`}
            />
            <SummaryStatCard
              label="Avg Confidence"
              value={`${summaryStats.averageConfidence.toFixed(1)} / 5`}
            />
            <SummaryStatCard
              label="Confidence Accuracy"
              value={`${summaryStats.confidenceAccuracyPercent}%`}
              helperText="Confidence matched correctness"
            />
            <SummaryStatCard
              label="Score Earned"
              value={`${summaryStats.scoreEarned}`}
            />
          </div>

          {bigMistakes.length > 0 && (
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-lg p-4 text-left space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-on-surface">Big Mistakes</p>
                <p className="text-xs text-on-surface-variant">You were confident but wrong on these.</p>
              </div>
              <ul className="space-y-2">
                {bigMistakes.map((entry) => (
                  <li key={entry.questionId} className="p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                    <p className="text-sm font-medium text-on-surface">{entry.questionText}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Selected: {entry.selectedAnswer} | Correct: {entry.correctAnswer} | Confidence: {entry.confidence}/5
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uncertainKnowledge.length > 0 && (
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-lg p-4 text-left space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-on-surface">Uncertain Knowledge</p>
                <p className="text-xs text-on-surface-variant">You got these right, but weren’t very sure.</p>
              </div>
              <ul className="space-y-2">
                {uncertainKnowledge.map((entry) => (
                  <li key={entry.questionId} className="p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                    <p className="text-sm font-medium text-on-surface">{entry.questionText}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Correct answer: {entry.correctAnswer} | Confidence: {entry.confidence}/5
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {challenge.trackMistakesForRedemption && redemptionItemsFromRun.length > 0 && (
            <div className="mt-6 bg-surface-container-low rounded-lg p-4 text-left space-y-3">
              <p className="text-sm font-semibold text-on-surface">We'll help you fix these mistakes later</p>
              <p className="text-xs text-on-surface-variant">
                Use the toggle to keep or remove this challenge's missed questions from Redemption.
              </p>
              <Toggle
                label="Keep in Redemption"
                description={
                  keepInRedemption
                    ? 'Turn this off to remove the missed questions from the Redemption queue.'
                    : 'Turn this back on to restore the missed questions to Redemption.'
                }
                checked={keepInRedemption}
                onChange={handleRedemptionToggle}
              />
            </div>
          )}

          <div className="flex gap-4 justify-center pt-4 flex-wrap">
            <SummaryActionButton
              label="Continue"
              onClick={() => navigate(isRedemptionRun ? '/redemption' : `/challenge/${challenge.id}`)}
            />
            <SummaryActionButton
              label="Retry Challenge"
              onClick={retryChallenge}
              variant="secondary"
            />
            {!isRedemptionRun && challenge.trackMistakesForRedemption && redemptionItemsFromRun.length > 0 && (
              <SummaryActionButton
                label="Go to Redemption"
                onClick={() => navigate('/redemption')}
                variant="ghost"
              />
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      animate={
        lastStepResult && phase === 'feedback' && !lastStepResult.isCorrect
          ? { x: [0, -5, 5, -3, 3, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.24 }}
      className="relative flex-grow pb-12 px-6 max-w-4xl mx-auto w-full flex flex-col gap-8 min-h-[80vh]"
    >
      <BackButton fallbackPath={backFallbackPath} onClick={() => setBackConfirmOpen(true)} />
      <PromptDialog
        open={backConfirmOpen}
        title="Leave this challenge?"
        description="Your progress is saved. You can come back and resume later."
      >
        <AnimatedButton
          type="button"
          onClick={() => setBackConfirmOpen(false)}
          variant="secondary"
          className="px-4 py-2 font-medium"
        >
          Stay
        </AnimatedButton>
        <AnimatedButton
          type="button"
          onClick={confirmBackNavigation}
          className="px-4 py-2 font-semibold"
        >
          Leave
        </AnimatedButton>
      </PromptDialog>
      <PromptDialog
        open={resumePromptOpen}
        title="Continue where you left off?"
        description="Pick up where you left off, or restart from question one."
      >
        <AnimatedButton
          type="button"
          onClick={restartSession}
          variant="secondary"
          className="px-4 py-2 font-medium"
        >
          Restart
        </AnimatedButton>
        <AnimatedButton
          type="button"
          onClick={resumeSession}
          className="px-4 py-2 font-semibold"
        >
          Resume
        </AnimatedButton>
      </PromptDialog>

      <AnimatePresence>
        {lastStepResult && phase === 'feedback' && (
          <motion.div
            key={`flash-${challengeState.currentQuestionIndex}-${lastStepResult.isCorrect ? 'c' : 'w'}`}
            initial={{ opacity: 0 }}
            animate={lastStepResult.isCorrect ? { opacity: 0 } : { opacity: [0, 0.45, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: lastStepResult.isCorrect ? 0.01 : 0.45 }}
            className={`absolute inset-0 rounded-lg pointer-events-none ${
              lastStepResult.isCorrect ? 'bg-transparent' : 'bg-error/30'
            }`}
          />
        )}
      </AnimatePresence>

      <section className="flex flex-col gap-4 py-8">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-[20px]">psychology</span>
          <span className="text-label-md font-medium tracking-wide uppercase">
            Question {String(challengeState.currentQuestionIndex + 1).padStart(2, '0')} of {String(challenge.questions.length).padStart(2, '0')}
          </span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold leading-tight text-on-surface">
          {question.prompt}
        </h1>
        <div className="flex gap-6 text-sm font-medium text-on-surface-variant">
          <span>Score: {challengeState.score}</span>
          <span>Streak: {challengeState.streak}</span>
        </div>
        {settings.timer && phase === 'answering' && secondsLeft !== null && (
          <div className="pt-1 space-y-2 w-full">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                <span className="material-symbols-outlined text-[16px]">timer</span>
                Time Pressure
              </span>
              <span className={`text-xs font-semibold ${secondsLeft <= 3 ? 'text-error' : 'text-on-surface'}`}>
                {secondsLeft}s left
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <motion.div
                className="h-full"
                initial={{ width: '100%' }}
                animate={{ width: `${timerPercent}%` }}
                transition={{ type: 'spring', stiffness: 160, damping: 24 }}
                style={{ backgroundColor: timerProgressColor }}
              />
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3">
        {question.options.map((option, idx) => {
          const isSelected = challengeState.selectedAnswer === idx
          const isCorrectOption = questionPrimaryCorrectIndex === idx
          const showFeedback = phase === 'feedback' && lastStepResult
          const selectedWrong = showFeedback && isSelected && !lastStepResult?.isCorrect

          let stateClass = 'bg-surface-container-low hover:bg-surface-container-high border-transparent'
          if (showFeedback && isCorrectOption) {
            stateClass = 'bg-tertiary-container/60 border-tertiary'
          } else if (selectedWrong) {
            stateClass = 'bg-error-container/70 border-error'
          } else if (isSelected) {
            stateClass = 'bg-surface-container-high border-primary-container'
          }

          return (
            <motion.button
              key={idx}
              onClick={() => selectAnswer(idx)}
              disabled={phase === 'feedback'}
              animate={
                showFeedback && isSelected && lastStepResult?.isCorrect
                  ? { scale: [1, 1.03, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.3 }}
              className={`group flex items-center p-5 rounded-lg transition-all duration-200 text-left border active:scale-[0.99] ${stateClass}`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold mr-4 transition-colors ${
                isSelected
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-highest text-on-surface-variant group-hover:text-primary'
              }`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className={`text-lg font-medium ${isSelected && phase === 'answering' ? 'text-on-primary-container' : 'text-on-surface'}`}>
                {option}
              </span>
              {phase === 'feedback' && isCorrectOption && (
                <span className="material-symbols-outlined ml-auto text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  task_alt
                </span>
              )}
              {phase === 'answering' && isSelected && (
                <span className="material-symbols-outlined ml-auto text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              )}
            </motion.button>
          )
        })}
      </section>

      <motion.section
        ref={confidenceSectionRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-6 bg-surface-container rounded-lg flex flex-col items-center gap-5"
      >
        <div className="text-center">
          <h3 className="text-sm font-medium text-on-surface-variant uppercase tracking-widest mb-1">Set Confidence Level</h3>
          <p className="text-sm text-outline">
            {canChooseConfidence ? 'High confidence gives bigger rewards and bigger penalties.' : 'Select an answer first to set confidence.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-on-surface-variant">Low</span>
          <ConfidenceSelector
            value={challengeState.confidence}
            disabled={!canChooseConfidence}
            onChange={(value) =>
              phase === 'answering' && setChallengeState((prev) => ({ ...prev, confidence: value }))
            }
          />
          <span className="text-sm text-on-surface-variant">High</span>
        </div>
        {hasConfidence && (
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="px-2 py-1 rounded bg-tertiary-container/40 text-tertiary">Correct: +{potentialGain}</span>
            <span className="px-2 py-1 rounded bg-error-container/40 text-error">Wrong: {potentialLoss}</span>
          </div>
        )}
      </motion.section>

      <AnimatePresence>
        {phase === 'feedback' && lastStepResult && (
          <div className="space-y-2">
            {answerFeedback && (
              <AnswerFeedback
                type={answerFeedback.type}
                message={answerFeedback.message}
                streak={answerFeedback.streak}
                showStreak={answerFeedback.showStreak}
                isStreakMilestone={answerFeedback.isStreakMilestone}
              />
            )}
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="p-4 rounded-lg border bg-surface-container-low border-outline-variant/25"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {timedOutAnswer ? 'timer_off' : 'speed'}
                  </span>
                  <p className="font-medium text-on-surface-variant">
                    {timedOutAnswer ? 'Timer ran out' : 'Score change'}
                  </p>
                </div>
                <p className="font-black text-lg text-on-surface">
                  {lastStepResult.scoreDelta > 0 ? `+${lastStepResult.scoreDelta}` : lastStepResult.scoreDelta}
                </p>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <section ref={actionSectionRef} className="mt-auto pt-8 flex items-center justify-between border-t border-outline-variant/10">
        <AnimatedButton type="button" variant="ghost" className="px-6 py-3 text-on-surface-variant font-medium flex items-center gap-2 hover:text-on-surface">
          <span className="material-symbols-outlined">flag</span>
          Report Issue
        </AnimatedButton>
        {phase === 'answering' ? (
          <button
            onClick={submit}
            disabled={challengeState.selectedAnswer === null || challengeState.confidence === null}
            className={`px-12 py-4 rounded-lg font-bold transition-all flex items-center gap-3 ${
              challengeState.selectedAnswer !== null && challengeState.confidence !== null
                ? 'bg-primary-container text-on-primary-container active:scale-95'
                : 'bg-surface-container-highest text-on-surface-variant opacity-50 cursor-not-allowed shadow-none'
            }`}
          >
            {challengeState.selectedAnswer === null ? 'SELECT AN ANSWER' : challengeState.confidence === null ? 'SET CONFIDENCE' : 'LOCK IN ANSWER'}
            <span className="material-symbols-outlined">lock</span>
          </button>
        ) : (
          <AnimatedButton
            onClick={continueFlow}
            className="px-12 py-4 font-bold flex items-center gap-3"
          >
            {isLastQuestion ? 'VIEW SUMMARY' : 'NEXT QUESTION'}
            <span className="material-symbols-outlined">arrow_forward</span>
          </AnimatedButton>
        )}
      </section>
    </motion.div>
  )
}
