import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChallengeCard } from '../components/challenge/ChallengeCard'
import { StatsSection } from '../components/StatsSection'
import { AnimatedCard } from '../components/ui/AnimatedCard'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import {
  getDailyChallengeFromChallenges,
  isDailyChallengeCompletedToday,
  markDailyChallengeCompletedToday,
} from '../utils/dailyChallenge'
import { getRedemptionQueue, sortRedemptionQueue } from '../utils/redemption'
import { getCurrentSession } from '../utils/session'
import { calculateStats } from '../utils/calculateStats'
import { ensurePlayerStatsFromRuns } from '../utils/playerStats'
import { getUserIdentity } from '../utils/userIdentity'

export function HomePage() {
  const { currentUser } = useAuth()
  const { challenges, quizRuns } = useAppData()
  const navigate = useNavigate()
  const session = getCurrentSession()
  const playerStats = useMemo(() => ensurePlayerStatsFromRuns(quizRuns), [quizRuns])
  const redemptionQueue = useMemo(() => sortRedemptionQueue(getRedemptionQueue()), [])
  const hasRedemptionItems = redemptionQueue.length > 0
  const dailyChallenge = useMemo(() => getDailyChallengeFromChallenges(challenges), [challenges])
  const dailyChallengeCompletedToday = dailyChallenge
    ? isDailyChallengeCompletedToday(dailyChallenge.id)
    : false

  const stats = useMemo(() => calculateStats(playerStats), [playerStats])

  const sessionProgressByChallengeId = useMemo(() => {
    if (!session) {
      return new Map<string, { completed: number; total: number }>()
    }

    const challenge = challenges.find((item) => item.id === session.challengeId)
    if (!challenge) {
      return new Map<string, { completed: number; total: number }>()
    }

    const completed = Math.max(0, Math.min(session.currentQuestionIndex, challenge.questionCount))
    if (completed <= 0 || completed >= challenge.questionCount) {
      return new Map<string, { completed: number; total: number }>()
    }

    return new Map<string, { completed: number; total: number }>([
      [challenge.id, { completed, total: challenge.questionCount }],
    ])
  }, [challenges, session])

  const continueLearningChallenges = useMemo(() => {
    if (!session) {
      return challenges.slice(0, 2)
    }

    const inProgressIndex = challenges.findIndex((challenge) => challenge.id === session.challengeId)
    if (inProgressIndex <= 0) {
      return challenges.slice(0, 2)
    }

    const reordered = [
      challenges[inProgressIndex],
      ...challenges.slice(0, inProgressIndex),
      ...challenges.slice(inProgressIndex + 1),
    ]

    return reordered.slice(0, 2)
  }, [challenges, session])

  return (
    <div className="w-full max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold font-headline text-on-background mb-2">
          Welcome back, {getUserIdentity(currentUser)}.
        </h1>
        <p className="text-on-surface-variant font-body">
          Complete study challenges to make sure you're locked in for the next test, or do fun challenges to climb the leaderboard.
        </p>
      </header>

      <section className="mb-12">
        {hasRedemptionItems ? (
          <AnimatedCard
            className="relative overflow-hidden bg-surface-container p-8 rounded-lg flex flex-col justify-between min-h-[300px]"
          >
            <div className="z-10">
              <span className="inline-block px-3 py-1 bg-primary-container/15 rounded-lg text-xs font-bold tracking-widest text-primary mb-4 uppercase">
                Priority Session
              </span>
              <h2 className="text-4xl font-black text-on-surface leading-tight mb-4">Daily Redemption</h2>
              <p className="text-on-surface-variant max-w-md text-lg">
                Everyone makes mistakes. What matters is whether we fix them or not. Review missed questions in a focused run.
              </p>
            </div>
            <div className="z-10 mt-8">
              <AnimatedButton
                onClick={() => navigate('/redemption')}
                className="px-8 py-3 font-bold"
              >
                View Redemption
              </AnimatedButton>
            </div>
          </AnimatedCard>
        ) : (
          <AnimatedCard
            className="relative overflow-hidden bg-surface-container p-8 rounded-lg flex flex-col justify-between min-h-[300px]"
          >
            <div className="z-10">
              <span className="inline-block px-3 py-1 bg-primary-container/15 rounded-lg text-xs font-bold tracking-widest text-primary mb-4 uppercase">
                Daily Challenge
              </span>
              <h2 className="text-4xl font-black text-on-surface leading-tight mb-2">Daily Challenge</h2>
              <p className="text-on-surface-variant max-w-md text-lg mb-3">Try something new today.</p>
              {!dailyChallenge && (
                <p className="text-on-surface-variant max-w-md text-lg">No challenges available yet</p>
              )}
            </div>
            <div className="z-10 mt-8">
              {dailyChallenge && dailyChallengeCompletedToday && (
                <p className="text-sm font-semibold text-tertiary mb-3">Completed Today</p>
              )}
              <AnimatedButton
                onClick={() => {
                  if (!dailyChallenge) {
                    return
                  }

                  markDailyChallengeCompletedToday(dailyChallenge.id)
                  navigate(`/challenge/${dailyChallenge.id}`)
                }}
                disabled={!dailyChallenge}
                className="px-8 py-3 font-bold"
              >
                View Challenge
              </AnimatedButton>
            </div>
          </AnimatedCard>
        )}
      </section>

      <section className="mb-12">
        <StatsSection
          stats={stats}
          keys={['accuracy', 'averageConfidence', 'confidenceAccuracy']}
          clickable
          onStatCardClick={() => navigate('/profile')}
        />
      </section>

      <section className="mb-12">
        <div className="flex justify-between items-end mb-6">
          <h3 className="text-xl font-bold font-headline">Continue Learning</h3>
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="text-primary text-sm font-semibold hover:underline"
          >
            View all progress
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {continueLearningChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              progress={sessionProgressByChallengeId.get(challenge.id)}
              onClick={() => navigate(`/challenge/${challenge.id}`)}
              onActionClick={() => navigate(`/play/${challenge.id}`)}
              actionLabel="Play Challenge"
            />
          ))}
        </div>
      </section>
    </div>
  )
}
