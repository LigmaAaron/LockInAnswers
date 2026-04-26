import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChallengeCard } from '../components/challenge/ChallengeCard'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { getCurrentSession } from '../utils/session'

type LibraryLocationState = {
  notice?: string
} | null

export function LibraryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LibraryLocationState
  const { currentUser } = useAuth()
  const { allChallenges, challenges, quizRuns } = useAppData()

  useEffect(() => {
    if (!locationState?.notice) {
      return
    }

    navigate(location.pathname, { replace: true })
  }, [location.pathname, locationState?.notice, navigate])

  const challengeById = useMemo(
    () => new Map(challenges.map((challenge) => [challenge.id, challenge])),
    [challenges],
  )

  const session = getCurrentSession()
  const inProgressChallenge = session ? challengeById.get(session.challengeId) : undefined

  const inProgressItem = useMemo(() => {
    if (!session || !inProgressChallenge) {
      return null
    }

    const completed = Math.max(0, Math.min(session.currentQuestionIndex, inProgressChallenge.questionCount))
    if (completed <= 0 || completed >= inProgressChallenge.questionCount) {
      return null
    }

    return {
      challenge: inProgressChallenge,
      completed,
      total: inProgressChallenge.questionCount,
    }
  }, [inProgressChallenge, session])

  const recentChallenges = useMemo(() => {
    const playedByRecent = quizRuns
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((run) => challengeById.get(run.challengeId))
      .filter((challenge): challenge is NonNullable<typeof challenge> => !!challenge)

    const createdByUser = challenges.filter((challenge) => challenge.createdBy === currentUser?.id)

    const deduped = new Map<string, (typeof challenges)[number]>()
    ;[...playedByRecent, ...createdByUser].forEach((challenge) => {
      if (!deduped.has(challenge.id)) {
        deduped.set(challenge.id, challenge)
      }
    })

    return Array.from(deduped.values()).slice(0, 8)
  }, [challengeById, challenges, currentUser?.id, quizRuns])

  const createdByYou = useMemo(
    () =>
      challenges.filter((challenge) => challenge.createdBy === currentUser?.id),
    [challenges, currentUser?.id],
  )

  const drafts = useMemo(
    () =>
      allChallenges
        .filter((challenge) => challenge.status === 'draft')
        .filter((challenge) => challenge.createdBy === currentUser?.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [allChallenges, currentUser?.id],
  )

  const formatUpdatedAt = (updatedAt: string) => {
    const date = new Date(updatedAt)
    if (Number.isNaN(date.getTime())) {
      return 'Last edited recently'
    }

    return `Last edited ${date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold font-headline text-on-background">Library</h1>
      </header>

      {locationState?.notice && (
        <div className="mb-6 p-3 rounded-lg bg-secondary-container text-on-secondary-container text-sm font-medium">
          {locationState.notice}
        </div>
      )}

      <section className="mb-12">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-bold font-headline">Drafts</h2>
        </div>

        {drafts.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No drafts saved yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {drafts.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                statusBadge="Draft"
                metadataText={formatUpdatedAt(challenge.updatedAt)}
                onClick={() => navigate(`/create/${challenge.id}`)}
                onActionClick={() => navigate(`/create/${challenge.id}`)}
                actionLabel="Continue Editing"
              />
            ))}
          </div>
        )}
      </section>

      {inProgressItem && (
        <section className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-xl font-bold font-headline">Continue Playing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChallengeCard
              challenge={inProgressItem.challenge}
              progress={{
                completed: inProgressItem.completed,
                total: inProgressItem.total,
              }}
              onClick={() => navigate(`/challenge/${inProgressItem.challenge.id}`)}
              onActionClick={() => navigate(`/play/${inProgressItem.challenge.id}`)}
              actionLabel="Resume Challenge"
            />
          </div>
        </section>
      )}

      <section className="mb-12">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-bold font-headline">Recent</h2>
        </div>

        {recentChallenges.length === 0 ? (
          <p className="text-on-surface-variant text-sm">No recent challenges yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onClick={() => navigate(`/challenge/${challenge.id}`)}
                onActionClick={() => navigate(`/play/${challenge.id}`)}
                actionLabel="Play Challenge"
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-bold font-headline">Created by You</h2>
        </div>

        {createdByYou.length === 0 ? (
          <p className="text-on-surface-variant text-sm">You haven’t created any challenges yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {createdByYou.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onClick={() => navigate(`/challenge/${challenge.id}`)}
                onActionClick={() => navigate(`/play/${challenge.id}`)}
                actionLabel="Play Challenge"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
