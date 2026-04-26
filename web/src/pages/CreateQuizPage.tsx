import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ChallengeMode, ChallengeSettings, QuizQuestion, TimerDurationSeconds } from '../types/models'
import { getPrimaryCorrectAnswerIndex, getQuestionCorrectAnswers, normalizeQuestionType } from '../types/models'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { Toggle } from '../components/ui/Toggle'
import { Appear } from '../components/ui/Appear'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { defaultChallengeSettings, getPresetDefaults } from '../utils/challengeSettings'
import {
  createChallengeRecord,
  updateChallengeRecord,
} from '../lib/challenges'

const emptyQuestion = (): QuizQuestion => ({
  id: crypto.randomUUID(),
  prompt: '',
  options: ['', '', '', ''],
  correctAnswers: [0],
  correctIndex: 0,
  questionType: 'multiple_choice',
  explanation: null,
})

export function CreateQuizPage() {
  const { currentUser } = useAuth()
  const { allChallenges, reloadChallenges, upsertChallengeCache } = useAppData()
  const navigate = useNavigate()
  const { challengeId } = useParams<{ challengeId?: string }>()

  const editingChallenge = useMemo(
    () => (challengeId ? allChallenges.find((challenge) => challenge.id === challengeId) ?? null : null),
    [allChallenges, challengeId],
  )
  const isEditing = !!challengeId && !!editingChallenge
  const isEditingDraft = isEditing && editingChallenge.status === 'draft'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()])
  const [mode, setMode] = useState<ChallengeMode>('study')
  const [settings, setSettings] = useState<ChallengeSettings>(getPresetDefaults('study').settings)
  const [trackMistakesForRedemption, setTrackMistakesForRedemption] = useState(
    getPresetDefaults('study').trackMistakesForRedemption,
  )
  const [message, setMessage] = useState('')

  const normalizeQuestionsForSave = (input: QuizQuestion[]) =>
    input.map((question) => {
      const correctAnswers = getQuestionCorrectAnswers(question)
      const primaryCorrectIndex = getPrimaryCorrectAnswerIndex({ correctAnswers })

      return {
        ...question,
        correctAnswers,
        correctIndex: primaryCorrectIndex,
        questionType: normalizeQuestionType(question.questionType),
        explanation: question.explanation ?? null,
      }
    })

  const buildChallengePayload = () => ({
    title,
    description,
    questions: normalizeQuestionsForSave(questions),
    mode,
    settings,
    trackMistakesForRedemption,
  })

  const saveDraft = () => {
    const payload = buildChallengePayload()

    void (async () => {
      if (!currentUser) {
        setMessage('No active user session.')
        return
      }

      try {
        console.log('[challenge-create] save draft request', {
          challengeId: editingChallenge?.id ?? null,
          currentUserId: currentUser.id,
          status: 'draft',
        })

        const savedChallenge = isEditingDraft
          ? await updateChallengeRecord(editingChallenge.id, currentUser.id, {
              ...payload,
              status: 'draft',
            })
          : await createChallengeRecord(currentUser.id, {
              ...payload,
              status: 'draft',
            })

        if (!savedChallenge) {
          setMessage('Unable to save draft. Please try again.')
          return
        }

        console.log('[challenge-create] save draft result', {
          challengeId: savedChallenge.id,
          currentUserId: currentUser.id,
        })

        upsertChallengeCache(savedChallenge)
        await reloadChallenges()

        navigate('/library', {
          state: {
            notice: 'Draft saved',
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save draft. Please try again.'
        setMessage(message)
      }
    })()
  }

  useEffect(() => {
    if (!challengeId) {
      return
    }

    if (!editingChallenge) {
      setMessage('Challenge not found for editing.')
      return
    }

    setTitle(editingChallenge.title)
    setDescription(editingChallenge.description)
    setQuestions(
      editingChallenge.questions.map((question) => ({
        ...question,
        options: [...question.options],
      })),
    )
    setMode(editingChallenge.mode)
    setSettings({ ...editingChallenge.settings })
    setTrackMistakesForRedemption(editingChallenge.trackMistakesForRedemption)
    setMessage('')
  }, [challengeId, editingChallenge])

  const applyModePreset = (nextMode: ChallengeMode) => {
    const preset = getPresetDefaults(nextMode)
    setMode(nextMode)
    setSettings({
      ...defaultChallengeSettings,
      ...preset.settings,
    })
    setTrackMistakesForRedemption(preset.trackMistakesForRedemption)
  }

  const updateQuestion = (idx: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) =>
      prev.map((question, index) => (index === idx ? { ...question, ...patch } : question)),
    )
  }

  const removeQuestion = (idx: number) => {
    if (questions.length > 1) {
      setQuestions((prev) => prev.filter((_, index) => index !== idx))
    }
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (!title.trim() || !description.trim()) {
      setMessage('Title and description are required.')
      return
    }

    const invalid = questions.some(
      (question) =>
        !question.prompt.trim() ||
        question.options.some((option) => !option.trim()) ||
        getPrimaryCorrectAnswerIndex(question) < 0 ||
        getPrimaryCorrectAnswerIndex(question) > 3,
    )

    if (invalid) {
      setMessage('Each question needs prompt, 4 options, and a correct answer.')
      return
    }

    const payload = buildChallengePayload()

    void (async () => {
      if (!currentUser) {
        setMessage('No active user session.')
        return
      }

      try {
        console.log('[challenge-create] publish request', {
          challengeId: editingChallenge?.id ?? null,
          currentUserId: currentUser.id,
          status: 'published',
        })

        const challenge = isEditing
          ? await updateChallengeRecord(editingChallenge.id, currentUser.id, {
              ...payload,
              status: 'published',
            })
          : await createChallengeRecord(currentUser.id, {
              ...payload,
              status: 'published',
            })

        if (!challenge) {
          setMessage('Unable to update challenge. Please try again.')
          return
        }

        console.log('[challenge-create] publish result', {
          challengeId: challenge.id,
          currentUserId: currentUser.id,
        })

        upsertChallengeCache(challenge)
        await reloadChallenges()
        navigate(`/challenge/${challenge.id}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update challenge. Please try again.'
        setMessage(message)
      }
    })()
  }

  return (
    <Appear className="max-w-6xl mx-auto">
      <form onSubmit={onSubmit}>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold text-on-surface tracking-tight font-headline">
              {isEditing ? 'Edit Challenge' : 'Create Challenge'}
            </h1>
            <p className="text-on-surface-variant font-label mt-2">Design a new assessment and configure engagement rules.</p>
          </div>
          <div className="flex gap-4">
            <AnimatedButton
              type="button"
              variant="secondary"
              className="px-6 py-2.5 font-semibold"
              onClick={saveDraft}
            >
              Save Draft
            </AnimatedButton>
            <AnimatedButton type="submit" className="px-8 py-2.5 rounded font-bold">
              {isEditing ? (isEditingDraft ? 'Publish' : 'Save Changes') : 'Publish'}
            </AnimatedButton>
          </div>
        </div>

        {message && <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg font-medium">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface-container p-8 rounded-lg">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                Challenge Identity
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">Quiz Title</label>
                  <input 
                    className="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/15 rounded-lg py-3 px-4 focus:ring-primary text-on-surface placeholder:text-outline transition-all" 
                    placeholder="e.g. Advanced JavaScript Architecture" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    type="text"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">Preset</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['study', 'competitive', 'casual'] as const).map((presetMode) => {
                      const selected = mode === presetMode
                      return (
                        <button
                          key={presetMode}
                          type="button"
                          onClick={() => applyModePreset(presetMode)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold border capitalize transition-colors ${
                            selected
                              ? 'bg-primary-container text-on-primary-container border-primary-container'
                              : 'bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-primary/40'
                          }`}
                        >
                          {presetMode}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2">
                    Study mode tracks missed questions for later practice.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">Description</label>
                  <textarea 
                    className="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/15 rounded-lg py-3 px-4 focus:ring-primary text-on-surface placeholder:text-outline transition-all" 
                    placeholder="Describe the learning objectives and audience..." 
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="bg-surface-container p-8 rounded-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">quiz</span>
                  Question Builder
                </h2>
                <span className="text-sm font-medium text-primary bg-secondary-container px-3 py-1 rounded">
                  {questions.length} Question{questions.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-6">
                {questions.map((question, index) => (
                  <div key={question.id} className="bg-surface-container-low p-6 rounded-lg ring-1 ring-outline-variant/15 relative">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-on-surface-variant mb-2">Question {index + 1} Text</label>
                      <input 
                        className="w-full bg-surface-container border-0 ring-1 ring-outline-variant/15 rounded-lg py-3 px-4 focus:ring-primary text-on-surface" 
                        type="text" 
                        value={question.prompt}
                        onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
                        placeholder="Enter your question here..."
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-on-surface-variant mb-2">Answers & Correct Selection</label>
                      {question.options.map((option, optIdx) => {
                                        const isCorrect = getPrimaryCorrectAnswerIndex(question) === optIdx;
                        return (
                          <div 
                            key={optIdx} 
                            className={`flex items-center gap-4 p-3 rounded-lg border-2 transition-colors ${
                              isCorrect 
                                ? 'bg-surface-container border-primary-container/40' 
                                : 'bg-surface-container border-transparent hover:border-outline-variant/40'
                            }`}
                          >
                            <button 
                              type="button"
                              onClick={() => updateQuestion(index, { correctAnswers: [optIdx], correctIndex: optIdx })}
                              className={`material-symbols-outlined ${isCorrect ? 'text-primary' : 'text-outline'}`}
                              style={{ fontVariationSettings: isCorrect ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              {isCorrect ? 'check_circle' : 'radio_button_unchecked'}
                            </button>
                            <input 
                              className="flex-1 bg-transparent border-0 focus:ring-0 text-on-surface p-0" 
                              type="text" 
                              value={option}
                              onChange={(e) => {
                                const nextOptions = [...question.options];
                                nextOptions[optIdx] = e.target.value;
                                updateQuestion(index, { options: nextOptions });
                              }}
                              placeholder={`Option ${optIdx + 1}`}
                            />
                          </div>
                        )
                      })}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-outline-variant/10 flex justify-between">
                      <button 
                        type="button"
                        onClick={() => removeQuestion(index)}
                        disabled={questions.length === 1}
                        className="flex items-center gap-2 text-on-surface-variant hover:text-error transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                type="button"
                onClick={() => setQuestions(prev => [...prev, emptyQuestion()])}
                className="w-full mt-6 py-4 border-2 border-dashed border-outline-variant/20 rounded-lg text-outline hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 font-medium"
              >
                <span className="material-symbols-outlined">add</span> Create New Question
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container p-8 rounded-lg">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                Rules & Settings
              </h2>
              <div className="space-y-6">
                <Toggle
                  label="Timer"
                  description="Apply per-question countdown pressure"
                  checked={settings.timer}
                  onChange={(checked) => setSettings((prev) => ({ ...prev, timer: checked }))}
                />
                {settings.timer && (
                  <div className="pl-4 pt-1">
                    <label className="block text-xs font-medium text-on-surface-variant mb-2">Time Per Question</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 15].map((seconds) => {
                        const typedSeconds = seconds as TimerDurationSeconds
                        const selected = settings.timerSeconds === typedSeconds
                        return (
                          <button
                            key={seconds}
                            type="button"
                            onClick={() =>
                              setSettings((prev) => ({ ...prev, timerSeconds: typedSeconds }))
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                              selected
                                ? 'bg-primary-container text-on-primary-container border-primary-container'
                                : 'bg-surface-container-low text-on-surface border-outline-variant/20 hover:border-primary/40'
                            }`}
                          >
                            {seconds}s
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <Toggle
                  label="Leaderboard"
                  description="Publish this challenge to competitive rankings"
                  checked={settings.leaderboard}
                  onChange={(checked) =>
                    setSettings((prev) => ({ ...prev, leaderboard: checked }))
                  }
                />
                <Toggle
                  label="Track Mistakes"
                  description="Add incorrect answers to Redemption queue"
                  checked={trackMistakesForRedemption}
                  onChange={(checked) =>
                    setTrackMistakesForRedemption(checked)
                  }
                />
              </div>
            </div>

            <div className="bg-surface-container p-8 rounded-lg relative overflow-hidden">
              <h2 className="text-lg font-bold mb-4">Final Checks</h2>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className={`material-symbols-outlined text-sm ${title && description ? 'text-tertiary' : 'text-outline'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {title && description ? 'check' : 'radio_button_unchecked'}
                  </span>
                  Title and description valid
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className={`material-symbols-outlined text-sm ${questions.every(q => q.prompt && q.options.every(o => o)) ? 'text-tertiary' : 'text-outline'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {questions.every(q => q.prompt && q.options.every(o => o)) ? 'check' : 'radio_button_unchecked'}
                  </span>
                  Questions have correct answers
                </li>
                <li className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check
                  </span>
                  Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </li>
              </ul>
              
              <div className="mt-8 bg-surface-container-low p-4 rounded-lg flex items-center gap-4 border border-outline-variant/10 opacity-50">
                <div className="w-12 h-12 rounded bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-outline">image</span>
                </div>
                <div>
                  <p className="text-sm font-bold">Add Cover Image</p>
                  <p className="text-xs text-on-surface-variant">PNG or JPG up to 10MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Appear>
  )
}
