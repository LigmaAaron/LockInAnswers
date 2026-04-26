import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type {
  Challenge,
  ChallengeStatus,
  ChallengeSettings,
  ChallengeRun,
  LeaderboardEntry,
  MissedQuestion,
  QuizQuestion,
  ScoringConfig,
  UiConfig,
} from '../types/models'
import {
  getPrimaryCorrectAnswerIndex,
  getQuestionCorrectAnswers,
  isQuestionSelectionCorrect,
  normalizeQuestionType,
} from '../types/models'
import { makeId, storage } from '../utils/storage'
import { normalizeChallengeId } from '../utils/challengeIdentity'
import { applyScoreDelta, defaultScoringConfig, getScoreDelta } from '../utils/scoring'
import { defaultChallengeSettings, mergeChallengeSettings } from '../utils/challengeSettings'
import { appendPlayerStatsFromAnswers, ensurePlayerStatsFromRuns } from '../utils/playerStats'
import { useAuth } from './AuthContext'
import {
  fetchAllChallenges,
  migrateLegacyChallengesToSupabase,
} from '../lib/challenges'
import { calculateEstimatedMinutes, calculateQuestionCount } from '../utils/challengeEstimation'

const UI_KEY = 'lia-ui-config'
const LEGACY_CHALLENGES_KEY = 'lia-challenges'
const LEADERBOARD_KEY = 'lia-leaderboard'
const CHALLENGE_LEADERBOARDS_KEY = 'lia-leaderboards'
const MISSED_KEY = 'lia-missed'
const RUNS_KEY = 'lia-runs'
const SCORING_KEY = 'lia-scoring-config'
type ChallengeMap = Record<string, Challenge>

const starterChallenges: Challenge[] = [
  {
    id: normalizeChallengeId('starter-space'),
    title: 'Quantum Mechanics 101',
    description: 'Lock in your confidence while testing physics fundamentals.',
    questionCount: 3,
    estimatedMinutes: 4,
    createdBy: 'LIA Team',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'published',
    mode: 'study',
    questions: [
      {
        id: 'q1',
        prompt: 'Which particle has a negative electric charge?',
        options: ['Proton', 'Neutron', 'Electron', 'Photon'],
        correctIndex: 2,
      },
      {
        id: 'q2',
        prompt: 'Planck\'s constant is central to which field?',
        options: ['Classical Mechanics', 'Quantum Physics', 'Thermodynamics', 'Optics'],
        correctIndex: 1,
      },
      {
        id: 'q3',
        prompt: 'What does wave-particle duality describe?',
        options: [
          'Only particles behave as waves',
          'Only waves behave as particles',
          'Matter and light can behave as both wave and particle',
          'Gravity creates light waves',
        ],
        correctIndex: 2,
      },
    ],
    settings: {
      ...defaultChallengeSettings,
      timer: false,
      leaderboard: false,
    },
    trackMistakesForRedemption: true,
  },
  {
    id: normalizeChallengeId('starter-stress'),
    title: 'Core Loop Stress Test (20Q)',
    description: 'Rapid confidence reps to pressure-test pacing, regret, and scoring balance.',
    questionCount: 20,
    estimatedMinutes: 15,
    createdBy: 'LIA Team',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'published',
    mode: 'competitive',
    questions: Array.from({ length: 20 }, (_, index) => {
      const a = 6 + index
      const b = 3 + ((index * 2) % 7)
      const correctValue = a + b
      const correctIndex = index % 4
      const options = [correctValue - 2, correctValue, correctValue + 2, correctValue + 4]
      const rotated = [...options]
      const correctOption = rotated[1]
      rotated.splice(1, 1)
      rotated.splice(correctIndex, 0, correctOption)

      return {
        id: `stress-${index + 1}`,
        prompt: `Stress Q${index + 1}: What is ${a} + ${b}?`,
        options: rotated.map((value) => String(value)),
        correctIndex,
      }
    }),
    settings: {
      ...defaultChallengeSettings,
      timer: true,
      leaderboard: true,
      timerSeconds: 5,
    },
    trackMistakesForRedemption: false,
  },
  {
    id: normalizeChallengeId('starter-history'),
    title: 'World History Blitz',
    description: 'Fast historical checkpoints for your streak.',
    questionCount: 3,
    estimatedMinutes: 5,
    createdBy: 'LIA Team',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'published',
    mode: 'study',
    questions: [
      {
        id: 'h1',
        prompt: 'In which year did World War II end?',
        options: ['1943', '1945', '1947', '1950'],
        correctIndex: 1,
      },
      {
        id: 'h2',
        prompt: 'Who was known as the Maid of Orleans?',
        options: ['Queen Victoria', 'Joan of Arc', 'Marie Curie', 'Catherine the Great'],
        correctIndex: 1,
      },
      {
        id: 'h3',
        prompt: 'The Renaissance began in which region?',
        options: ['Scandinavia', 'South America', 'Italy', 'Middle East'],
        correctIndex: 2,
      },
    ],
    settings: {
      ...defaultChallengeSettings,
      timer: false,
      leaderboard: false,
    },
    trackMistakesForRedemption: true,
  },
  {
    id: normalizeChallengeId('starter-apush-period-8-9'),
    title: 'APUSH Period 8 & 9 Master Drill',
    description: 'High-yield Cold War to modern America practice',
    questionCount: 40,
    estimatedMinutes: 80,
    createdBy: 'LIA Team',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: 'published',
    mode: 'study',
    questions: [
      {
        id: 'q1',
        prompt: 'The primary goal of the Truman Doctrine was to',
        options: ['rebuild Japan', 'contain communism', 'promote isolationism', 'expand colonial empires'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        prompt: 'The Marshall Plan aimed to',
        options: ['support Asian allies', 'rebuild Western Europe', 'create NATO', 'fund nuclear weapons'],
        correctIndex: 1,
      },
      {
        id: 'q3',
        prompt: 'The formation of NATO reflected',
        options: ['U.S. isolationism', 'collective security against the Soviet Union', 'economic cooperation only', 'decolonization'],
        correctIndex: 1,
      },
      {
        id: 'q4',
        prompt: 'Which event increased fears of communist expansion in Asia?',
        options: ['Chinese Communist Revolution', 'Fall of Berlin Wall', 'Cuban Missile Crisis', 'Détente'],
        correctIndex: 0,
      },
      {
        id: 'q5',
        prompt: 'McCarthyism is best described as',
        options: ['support for civil rights', 'fear-driven accusations of communism', 'economic reform', 'anti-war protest'],
        correctIndex: 1,
      },
      {
        id: 'q6',
        prompt: 'The Korean War ended with',
        options: ['North Korean victory', 'unified Korea', 'stalemate near the 38th parallel', 'U.S. withdrawal from Asia'],
        correctIndex: 2,
      },
      {
        id: 'q7',
        prompt: 'Brown v. Board of Education declared that',
        options: ['segregation was legal', 'separate but equal was unconstitutional', 'schools should remain local', 'voting rights expanded'],
        correctIndex: 1,
      },
      {
        id: 'q8',
        prompt: 'The Montgomery Bus Boycott demonstrated the effectiveness of',
        options: ['violent resistance', 'nonviolent protest', 'court rulings', 'federal troops'],
        correctIndex: 1,
      },
      {
        id: 'q9',
        prompt: 'The Civil Rights Act of 1964 primarily',
        options: ['expanded voting rights', 'ended segregation in public places', 'created welfare programs', 'ended the Vietnam War'],
        correctIndex: 1,
      },
      {
        id: 'q10',
        prompt: 'The Voting Rights Act of 1965 targeted',
        options: ['economic inequality', 'school segregation', 'barriers to Black suffrage', 'immigration limits'],
        correctIndex: 2,
      },
      {
        id: 'q11',
        prompt: 'Which group emphasized Black power and self-defense?',
        options: ['SNCC (early)', 'NAACP', 'Black Panthers', 'SCLC'],
        correctIndex: 2,
      },
      {
        id: 'q12',
        prompt: 'The Great Society focused on',
        options: ['tax cuts', 'ending poverty and inequality', 'military expansion', 'foreign policy'],
        correctIndex: 1,
      },
      {
        id: 'q13',
        prompt: 'Medicare and Medicaid were created to',
        options: ['fund education', 'expand healthcare access', 'reduce taxes', 'support businesses'],
        correctIndex: 1,
      },
      {
        id: 'q14',
        prompt: 'The Gulf of Tonkin Resolution allowed',
        options: ['withdrawal from Vietnam', 'increased presidential war powers', 'peace negotiations', 'UN intervention'],
        correctIndex: 1,
      },
      {
        id: 'q15',
        prompt: 'The Tet Offensive led many Americans to',
        options: ['support the war more', 'question U.S. progress in Vietnam', 'ignore Vietnam', 'support communism'],
        correctIndex: 1,
      },
      {
        id: 'q16',
        prompt: 'Détente refers to',
        options: ['Cold War escalation', 'relaxed tensions', 'nuclear war', 'economic collapse'],
        correctIndex: 1,
      },
      {
        id: 'q17',
        prompt: 'The policy of détente included',
        options: ['arms reduction talks', 'war in Korea', 'Marshall Plan', 'Truman Doctrine'],
        correctIndex: 0,
      },
      {
        id: 'q18',
        prompt: 'Watergate resulted in',
        options: ['Nixon impeachment', 'Nixon resignation', 'expanded trust in government', 'Supreme Court reform'],
        correctIndex: 1,
      },
      {
        id: 'q19',
        prompt: 'The environmental movement led to',
        options: ['EPA creation', 'end of war', 'tax cuts', 'civil rights laws'],
        correctIndex: 0,
      },
      {
        id: 'q20',
        prompt: 'The feminist movement achieved',
        options: ['Equal Pay Act', 'end of segregation', 'war withdrawal', 'tax reform'],
        correctIndex: 0,
      },
      {
        id: 'q21',
        prompt: 'Roe v. Wade addressed',
        options: ['education', 'abortion rights', 'civil rights', 'immigration'],
        correctIndex: 1,
      },
      {
        id: 'q22',
        prompt: 'The conservative movement in the 1980s emphasized',
        options: ['big government', 'lower taxes and deregulation', 'isolationism', 'labor unions'],
        correctIndex: 1,
      },
      {
        id: 'q23',
        prompt: 'Reaganomics was based on',
        options: ['supply-side economics', 'socialism', 'high taxes', 'regulation'],
        correctIndex: 0,
      },
      {
        id: 'q24',
        prompt: 'The end of the Cold War is associated with',
        options: ['Vietnam War', 'collapse of Soviet Union', 'Korean War', 'NATO formation'],
        correctIndex: 1,
      },
      {
        id: 'q25',
        prompt: 'Globalization increased',
        options: ['isolation', 'economic interdependence', 'tariffs', 'local economies only'],
        correctIndex: 1,
      },
      {
        id: 'q26',
        prompt: 'NAFTA was designed to',
        options: ['limit trade', 'expand free trade in North America', 'end immigration', 'support war efforts'],
        correctIndex: 1,
      },
      {
        id: 'q27',
        prompt: '9/11 led to',
        options: ['Cold War', 'War on Terror', 'Great Depression', 'Civil Rights Act'],
        correctIndex: 1,
      },
      {
        id: 'q28',
        prompt: 'The Patriot Act increased',
        options: ['privacy protections', 'government surveillance', 'taxes', 'immigration limits'],
        correctIndex: 1,
      },
      {
        id: 'q29',
        prompt: 'The Iraq War (2003) was justified by claims of',
        options: ['economic competition', 'weapons of mass destruction', 'colonialism', 'civil rights'],
        correctIndex: 1,
      },
      {
        id: 'q30',
        prompt: 'The 2008 financial crisis led to',
        options: ['economic boom', 'government bailouts', 'war expansion', 'tax elimination'],
        correctIndex: 1,
      },
      {
        id: 'q31',
        prompt: 'The Affordable Care Act aimed to',
        options: ['cut defense spending', 'expand healthcare access', 'reduce trade', 'limit voting'],
        correctIndex: 1,
      },
      {
        id: 'q32',
        prompt: 'The rise of the Sunbelt led to',
        options: ['population shift south and west', 'industrial decline everywhere', 'urban decline only', 'less migration'],
        correctIndex: 0,
      },
      {
        id: 'q33',
        prompt: 'The GI Bill helped veterans by',
        options: ['giving land', 'providing education and housing benefits', 'ending war', 'creating jobs only'],
        correctIndex: 1,
      },
      {
        id: 'q34',
        prompt: 'Suburbanization was driven by',
        options: ['industrial jobs', 'highways and affordable housing', 'urban growth', 'war'],
        correctIndex: 1,
      },
      {
        id: 'q35',
        prompt: 'The space race reflected',
        options: ['economic competition only', 'Cold War rivalry', 'civil rights movement', 'globalization'],
        correctIndex: 1,
      },
      {
        id: 'q36',
        prompt: 'Which movement focused on environmental protection?',
        options: ['Progressive', 'Green movement', 'Civil Rights', 'Populist'],
        correctIndex: 1,
      },
      {
        id: 'q37',
        prompt: 'The Immigration Act of 1965',
        options: ['restricted immigration', 'ended quotas based on nationality', 'stopped migration', 'focused on Europe only'],
        correctIndex: 1,
      },
      {
        id: 'q38',
        prompt: 'The rise of conservatism was partly a reaction to',
        options: ['New Deal', 'liberal social policies', 'colonialism', 'industrialization'],
        correctIndex: 1,
      },
      {
        id: 'q39',
        prompt: 'The War on Terror primarily targeted',
        options: ['communist nations', 'terrorist organizations', 'European allies', 'Latin America'],
        correctIndex: 1,
      },
      {
        id: 'q40',
        prompt: 'Modern political polarization is best described as',
        options: ['agreement between parties', 'growing ideological division', 'end of elections', 'one-party system'],
        correctIndex: 1,
      },
    ],
    settings: {
      ...defaultChallengeSettings,
      timer: false,
      leaderboard: false,
      timerSeconds: 10,
    },
    trackMistakesForRedemption: true,
  },
]

const defaultUiConfig: UiConfig = {
  brandName: 'MCQ Hub',
  topbarCtaLabel: 'Create Challenge',
  sidebarItems: [
    { key: 'home', label: 'Home', path: '/home', icon: 'home' },
    { key: 'library', label: 'Library', path: '/library', icon: 'library' },
    { key: 'redemption', label: 'Revise', path: '/redemption', icon: 'redemption' },
    {
      key: 'leaderboards',
      label: 'Leaderboards',
      path: '/leaderboards',
      icon: 'leaderboards',
    },
    { key: 'create', label: 'Create', path: '/create', icon: 'create' },
    { key: 'profile', label: 'Profile', path: '/profile', icon: 'profile' },
    { key: 'settings', label: 'Settings', path: '/settings', icon: 'settings' },
  ],
}

const ensureLibrarySidebarItem = (config: UiConfig): UiConfig => {
  const hasLibrary = config.sidebarItems.some((item) => item.path === '/library' || item.key === 'library')
  if (hasLibrary) {
    return config
  }

  const homeIndex = config.sidebarItems.findIndex((item) => item.key === 'home')
  const libraryItem = {
    key: 'library',
    label: 'Library',
    path: '/library',
    icon: 'library' as const,
  }

  const nextSidebarItems = [...config.sidebarItems]
  if (homeIndex >= 0) {
    nextSidebarItems.splice(homeIndex + 1, 0, libraryItem)
  } else {
    nextSidebarItems.unshift(libraryItem)
  }

  return {
    ...config,
    sidebarItems: nextSidebarItems,
  }
}

type RecordPayload = {
  userId: string
  userName: string
  challenge: Challenge
  answers: Array<{
    question: QuizQuestion
    selectedIndex: number
    confidence: number
    pointsEarned?: number
  }>
}

type AppDataContextValue = {
  uiConfig: UiConfig
  updateUiConfig: (patch: Partial<UiConfig>) => void
  scoringConfig: ScoringConfig
  allChallenges: Challenge[]
  challenges: Challenge[]
  reloadChallenges: () => Promise<void>
  upsertChallengeCache: (challenge: Challenge) => void
  addChallenge: (payload: {
    title: string
    description: string
    createdBy: string
    questions: QuizQuestion[]
    mode: Challenge['mode']
    settings: ChallengeSettings
    trackMistakesForRedemption: boolean
    status?: ChallengeStatus
  }) => Challenge
  updateChallenge: (payload: {
    id: string
    title: string
    description: string
    questions: QuizQuestion[]
    mode: Challenge['mode']
    settings: ChallengeSettings
    trackMistakesForRedemption: boolean
    status?: ChallengeStatus
  }) => Challenge | null
  setChallengeVerification: (payload: {
    id: string
    is_verified: boolean
    verified_by: string | null
    verified_at: string | null
  }) => Challenge | null
  leaderboard: LeaderboardEntry[]
  quizRuns: ChallengeRun[]
  missedQuestions: MissedQuestion[]
  recordQuizResult: (payload: RecordPayload) => { score: number; correct: number; total: number }
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

const normalizeChallenge = (challenge: Challenge): Challenge => {
  const is_verified = challenge.is_verified ?? challenge.isVerified ?? false
  const id = normalizeChallengeId(challenge.id)
  const normalizedQuestions = challenge.questions.map((question) => {
    const correctAnswers = getQuestionCorrectAnswers(question)

    return {
      ...question,
      correctAnswers,
      correctIndex: getPrimaryCorrectAnswerIndex({ correctAnswers }),
      questionType: normalizeQuestionType(question.questionType),
      explanation: question.explanation ?? null,
    }
  })

  return {
    ...challenge,
    id,
    createdAt: challenge.createdAt ?? new Date().toISOString(),
    updatedAt: challenge.updatedAt ?? challenge.createdAt ?? new Date().toISOString(),
    status: challenge.status ?? 'published',
    mode: challenge.mode ?? 'study',
    questions: normalizedQuestions,
    settings: mergeChallengeSettings(challenge.settings),
    trackMistakesForRedemption: challenge.trackMistakesForRedemption ?? true,
    is_verified,
    verified_by: challenge.verified_by ?? null,
    verified_at: challenge.verified_at ?? null,
    isVerified: is_verified,
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { currentUser, authLoading } = useAuth()
  const [uiConfig, setUiConfig] = useState<UiConfig>(() =>
    ensureLibrarySidebarItem(storage.get(UI_KEY, defaultUiConfig)),
  )
  const [scoringConfig] = useState<ScoringConfig>(() =>
    storage.get(SCORING_KEY, defaultScoringConfig),
  )
  const [challengeMap, setChallengeMap] = useState<ChallengeMap>({})
  const challengeLoadUserIdRef = useRef<string | null>(null)
  const allChallenges = useMemo(() => Object.values(challengeMap), [challengeMap])
  const challenges = useMemo(
    () => allChallenges.filter((challenge) => challenge.status === 'published'),
    [allChallenges],
  )
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    storage.get(LEADERBOARD_KEY, []),
  )
  const [quizRuns, setQuizRuns] = useState<ChallengeRun[]>(() => storage.get(RUNS_KEY, []))
  const [missedQuestions, setMissedQuestions] = useState<MissedQuestion[]>(() =>
    storage.get(MISSED_KEY, []),
  )

  const appendChallengeLeaderboardEntry = (
    challengeId: string,
    entry: { userId: string; username: string; score: number; completedAt: number },
  ) => {
    const existing = storage.get<Record<string, Array<{ userId: string; username: string; score: number; completedAt: number }>>>(
      CHALLENGE_LEADERBOARDS_KEY,
      {},
    )

    const current = existing[challengeId] ?? []
    storage.set(CHALLENGE_LEADERBOARDS_KEY, {
      ...existing,
      [challengeId]: [entry, ...current],
    })
  }

  useEffect(() => storage.set(UI_KEY, uiConfig), [uiConfig])
  useEffect(() => storage.set(SCORING_KEY, scoringConfig), [scoringConfig])
  useEffect(() => storage.set(LEADERBOARD_KEY, leaderboard), [leaderboard])
  useEffect(() => storage.set(RUNS_KEY, quizRuns), [quizRuns])
  useEffect(() => storage.set(MISSED_KEY, missedQuestions), [missedQuestions])
  useEffect(() => {
    ensurePlayerStatsFromRuns(quizRuns)
  }, [quizRuns])

  const syncChallengesFromBackend = useCallback(async (userId: string) => {
    if (challengeLoadUserIdRef.current === userId) {
      return
    }

    console.log('[challenge-sync] load start', {
      userId,
      source: 'supabase',
    })

    if (!storage.get<boolean>('lia-challenges-migrated', false)) {
      const legacySaved = storage.get<Record<string, Challenge> | Challenge[]>(LEGACY_CHALLENGES_KEY, {})
      const legacyChallenges = Array.isArray(legacySaved) ? legacySaved : Object.values(legacySaved)
      console.log('[challenge-migration] start', {
        userId,
        legacyCount: legacyChallenges.length + starterChallenges.length,
      })

      const migrated = await migrateLegacyChallengesToSupabase(userId, [...starterChallenges, ...legacyChallenges])
      console.log('[challenge-migration] complete', {
        userId,
        migratedCount: migrated.length,
        migratedIds: migrated.map((challenge) => challenge.id),
      })
    }

    const backendChallenges = await fetchAllChallenges(userId)
    console.log('[challenge-sync] backend load result', {
      userId,
      source: 'supabase',
      count: backendChallenges.length,
      ids: backendChallenges.map((challenge) => challenge.id),
    })

    setChallengeMap(
      backendChallenges.reduce<ChallengeMap>((acc, challenge) => {
        acc[challenge.id] = challenge
        return acc
      }, {}),
    )
    challengeLoadUserIdRef.current = userId
  }, [])

  useEffect(() => {
    if (authLoading || !currentUser) {
      return
    }

    void syncChallengesFromBackend(currentUser.id).catch((error) => {
      console.error('[challenge-sync] failed', {
        userId: currentUser.id,
        error: error instanceof Error ? error.message : 'unknown error',
      })
    })
  }, [authLoading, currentUser, syncChallengesFromBackend])

  const reloadChallenges = useCallback(async () => {
    if (!currentUser) {
      return
    }

    challengeLoadUserIdRef.current = null
    await syncChallengesFromBackend(currentUser.id)
  }, [currentUser, syncChallengesFromBackend])

  const upsertChallengeCache = useCallback((challenge: Challenge) => {
    setChallengeMap((prev) => ({
      ...prev,
      [challenge.id]: challenge,
    }))
  }, [])

  const updateUiConfig = (patch: Partial<UiConfig>) => {
    setUiConfig((prev) => ({ ...prev, ...patch }))
  }

  const addChallenge = ({
    title,
    description,
    createdBy,
    questions,
    mode,
    settings,
    trackMistakesForRedemption,
    status,
  }: {
    title: string
    description: string
    createdBy: string
    questions: QuizQuestion[]
    mode: Challenge['mode']
    settings: ChallengeSettings
    trackMistakesForRedemption: boolean
    status?: ChallengeStatus
  }) => {
    const now = new Date().toISOString()
    const challenge: Challenge = {
      id: makeId(),
      title,
      description,
      questionCount: calculateQuestionCount(questions),
      estimatedMinutes: calculateEstimatedMinutes(questions),
      createdBy,
      createdAt: now,
      updatedAt: now,
      status: status ?? 'published',
      questions,
      mode,
      settings,
      trackMistakesForRedemption,
    }

    setChallengeMap((prev) => ({
      ...prev,
      [challenge.id]: challenge,
    }))
    return challenge
  }

  const updateChallenge = ({
    id,
    title,
    description,
    questions,
    mode,
    settings,
    trackMistakesForRedemption,
    status,
  }: {
    id: string
    title: string
    description: string
    questions: QuizQuestion[]
    mode: Challenge['mode']
    settings: ChallengeSettings
    trackMistakesForRedemption: boolean
    status?: ChallengeStatus
  }) => {
    const existing = challengeMap[id]
    if (!existing) {
      return null
    }

    const challenge: Challenge = {
      ...existing,
      title,
      description,
      questionCount: calculateQuestionCount(questions),
      estimatedMinutes: calculateEstimatedMinutes(questions),
      updatedAt: new Date().toISOString(),
      status: status ?? existing.status,
      questions,
      mode,
      settings,
      trackMistakesForRedemption,
    }
    setChallengeMap((prev) => ({
      ...prev,
      [challenge.id]: challenge,
    }))

    return challenge
  }

  const setChallengeVerification = ({
    id,
    is_verified,
    verified_by,
    verified_at,
  }: {
    id: string
    is_verified: boolean
    verified_by: string | null
    verified_at: string | null
  }) => {
    const existing = challengeMap[id]
    if (!existing) {
      return null
    }

    const challenge: Challenge = {
      ...existing,
      is_verified,
      verified_by,
      verified_at,
      isVerified: is_verified,
      updatedAt: new Date().toISOString(),
    }

    setChallengeMap((prev) => ({
      ...prev,
      [challenge.id]: normalizeChallenge(challenge),
    }))

    return challenge
  }

  const recordQuizResult = ({ userId, userName, challenge, answers }: RecordPayload) => {
    let score = 0
    let correct = 0
    let confidenceSum = 0
    let alignedCount = 0
    const missed: MissedQuestion[] = []

    const runAnswers = answers.map(({ question, selectedIndex, confidence, pointsEarned }) => {
      if (!question) {
        return null
      }

      const primaryCorrectIndex = getPrimaryCorrectAnswerIndex(question)
      const isCorrect = isQuestionSelectionCorrect(question, selectedIndex)
      const scoreDelta =
        typeof pointsEarned === 'number'
          ? Math.round(pointsEarned)
          : getScoreDelta(isCorrect, confidence, scoringConfig)
      const confidenceAligned = (isCorrect && confidence >= 4) || (!isCorrect && confidence <= 2)

      score = applyScoreDelta(score, scoreDelta)
      confidenceSum += confidence

      if (confidenceAligned) {
        alignedCount += 1
      }

      if (isCorrect) {
        correct += 1
      } else {
        missed.push({
          id: makeId(),
          userId,
          challengeId: challenge.id,
          challengeTitle: challenge.title,
          prompt: question.prompt,
          correctAnswer: question.options[primaryCorrectIndex] ?? 'Unknown',
          guessedAnswer: selectedIndex >= 0 ? question.options[selectedIndex] : 'No answer',
          confidence,
          createdAt: new Date().toISOString(),
        })
      }

      return {
        questionId: question.id,
        prompt: question.prompt,
        options: question.options,
        correctIndex: primaryCorrectIndex,
        selectedIndex,
        confidence,
        isCorrect,
        scoreDelta,
        confidenceAligned,
      }
    })

    const finalizedAnswers = runAnswers.filter((answer) => answer !== null)

    const total = finalizedAnswers.length
    const averageConfidence = total ? confidenceSum / total : 0
    const confidenceAccuracy = total ? (alignedCount / total) * 100 : 0

    appendPlayerStatsFromAnswers(
      finalizedAnswers.map((answer) => ({
        isCorrect: answer.isCorrect,
        confidence: answer.confidence,
      })),
    )

    const run: ChallengeRun = {
      id: makeId(),
      userId,
      userName,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      score,
      correct,
      total,
      averageConfidence,
      confidenceAccuracy,
      answers: finalizedAnswers,
      createdAt: new Date().toISOString(),
    }

    if ((challenge.is_verified ?? challenge.isVerified) === true && challenge.settings.leaderboard) {
      const completedAt = Date.now()

      setLeaderboard((prev) => [
        {
          id: makeId(),
          userId,
          userName,
          challengeTitle: challenge.title,
          score,
          correct,
          total,
          averageConfidence,
          confidenceAccuracy,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])

      appendChallengeLeaderboardEntry(challenge.id, {
        userId,
        username: userName,
        score,
        completedAt,
      })
    } else if (challenge.settings.leaderboard) {
      appendChallengeLeaderboardEntry(challenge.id, {
        userId,
        username: userName,
        score,
        completedAt: Date.now(),
      })
    }

    setQuizRuns((prev) => [run, ...prev].slice(0, 300))

    setMissedQuestions((prev) => [...missed, ...prev].slice(0, 300))

    return { score, correct, total }
  }

  const value = useMemo(
    () => ({
      uiConfig,
      updateUiConfig,
      scoringConfig,
      allChallenges,
      challenges,
      reloadChallenges,
      upsertChallengeCache,
      addChallenge,
      updateChallenge,
      setChallengeVerification,
      leaderboard,
      quizRuns,
      missedQuestions,
      recordQuizResult,
    }),
    [
      uiConfig,
      scoringConfig,
      allChallenges,
      challenges,
      reloadChallenges,
      upsertChallengeCache,
      leaderboard,
      quizRuns,
      missedQuestions,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider')
  }
  return context
}
