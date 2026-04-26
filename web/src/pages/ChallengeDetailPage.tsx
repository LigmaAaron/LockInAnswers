import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Leaderboard } from '../components/Leaderboard'
import { DetailHeroCard } from '../components/challenge/DetailHeroCard'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { BackButton } from '../components/ui/BackButton'
import { AnimatedCard } from '../components/ui/AnimatedCard'
import { ModeBadge } from '../components/ui/ModeBadge'
import { LeaderboardInfoNote } from '../components/leaderboard/LeaderboardInfoNote'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { setChallengeVerification as setChallengeVerificationInDb } from '../lib/challenges'
import { buildChallengeLeaderboard, type LeaderboardTimeFilter } from '../utils/leaderboards'
import { mergeChallengeSettings } from '../utils/challengeSettings'

const timeFilterOptions: Array<{ value: LeaderboardTimeFilter; label: string }> = [
  { value: 'all-time', label: 'All-time' },
  { value: 'this-week', label: 'This week' },
]

type ChallengeDetailLocationState = {
  scrollTo?: 'leaderboard'
  fromChallengeCompleteLeaderboard?: boolean
} | null

export function ChallengeDetailPage() {
  const { challengeId } = useParams<{ challengeId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as ChallengeDetailLocationState
  const { allChallenges, quizRuns, setChallengeVerification } = useAppData()
  const { currentUser, authLoading } = useAuth()
  const leaderboardRef = useRef<HTMLElement | null>(null)
  const [timeFilter, setTimeFilter] = useState<LeaderboardTimeFilter>('all-time')
  const [verificationMutationPending, setVerificationMutationPending] = useState(false)
  const [verificationMutationError, setVerificationMutationError] = useState<string | null>(null)

  const challenge = useMemo(() => {
    if (!challengeId) {
      return null
    }

    const match = allChallenges.find((item) => item.id === challengeId)
    if (!match || match.status === 'draft') {
      return null
    }
    console.log('[challenge-detail] route/load', {
      routeChallengeId: challengeId,
      loadedChallengeId: match.id,
    })
    return {
      ...match,
      settings: mergeChallengeSettings(match.settings),
    }
  }, [allChallenges, challengeId])

  const challengeLeaderboard = useMemo(() => {
    if (!challenge) {
      return []
    }

    return buildChallengeLeaderboard(challenge, quizRuns, timeFilter)
  }, [challenge, quizRuns, timeFilter])

  if (!challenge) {
    return (
      <div className="w-full max-w-4xl mx-auto py-10">
        <AnimatedCard className="p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant">search_off</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Challenge Not Found</h1>
          <p className="text-on-surface-variant mb-6">
            The challenge you requested does not exist or was removed.
          </p>
          <AnimatedButton type="button" variant="primary" onClick={() => navigate('/home')}>
            Back Home
          </AnimatedButton>
        </AnimatedCard>
      </div>
    )
  }

  const isCreator = currentUser?.id === challenge.createdBy
  const creatorName = challenge.creatorUsername || challenge.createdBy
  const creatorInitial = creatorName.trim().charAt(0).toUpperCase() || '?'
  const canNavigateToCreatorProfile = challenge.createdBy === currentUser?.id
  const isAdmin = currentUser?.role === 'admin'
  const shouldShowAdminVerification = !authLoading && !!currentUser && isAdmin
  const isVerified = (challenge.is_verified ?? challenge.isVerified) === true
  const shouldBackToLibrary = locationState?.fromChallengeCompleteLeaderboard === true
  const verificationBadge = isVerified ? (
    <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-tertiary-container/25 text-tertiary">
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-surface-container-highest text-on-surface-variant">
      Unverified
    </span>
  )

  const toggleVerification = async () => {
    if (!currentUser || !isAdmin || verificationMutationPending) {
      return
    }

    setVerificationMutationPending(true)
    setVerificationMutationError(null)

    try {
      const nextVerified = !isVerified

      console.log('[challenge-verification] request', {
        challengeId: challenge.id,
        userId: currentUser.id,
        nextVerified,
      })

      const updated = await setChallengeVerificationInDb(challenge.id, nextVerified)

      setChallengeVerification({
        id: updated.id,
        is_verified: (updated.is_verified ?? updated.isVerified) === true,
        verified_by: updated.verified_by ?? null,
        verified_at: updated.verified_at ?? null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update verification status.'
      setVerificationMutationError(message)
    } finally {
      setVerificationMutationPending(false)
    }
  }

  useEffect(() => {
    console.log('[challenge-verification] visibility check', {
      authLoading,
      challengeId: challenge.id,
      challengeCreatorId: challenge.createdBy,
      currentUserId: currentUser?.id,
      currentUserRole: currentUser?.role,
      shouldShowAdminVerification,
    })
  }, [
    authLoading,
    challenge.createdBy,
    challenge.id,
    currentUser?.id,
    currentUser?.role,
    shouldShowAdminVerification,
  ])

  useEffect(() => {
    if (locationState?.scrollTo !== 'leaderboard') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      const leaderboardTop = leaderboardRef.current?.getBoundingClientRect().top
      if (leaderboardTop === undefined) {
        return
      }

      window.scrollTo({
        top: Math.max(0, leaderboardTop + window.scrollY - 16),
        behavior: 'smooth',
      })

      navigate(location.pathname, {
        replace: true,
        state: {
          fromChallengeCompleteLeaderboard: shouldBackToLibrary,
        },
      })
    }, 80)

    return () => window.clearTimeout(timeoutId)
  }, [location.pathname, locationState, navigate, shouldBackToLibrary])

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-10">
      <BackButton
        fallbackPath="/home"
        onClick={() => navigate('/library', { replace: true })}
      />
      <DetailHeroCard
        title={challenge.title}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <ModeBadge mode={challenge.mode} />
            {verificationBadge}
          </div>
        }
        metadata={
          canNavigateToCreatorProfile ? (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex w-full items-center gap-3 rounded-lg bg-surface-container-low px-3 py-3 text-left transition-[transform,background-color] duration-200 hover:bg-surface-container-high active:scale-[0.99]"
              aria-label={`View ${creatorName} profile`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-sm font-bold text-on-surface-variant">
                {creatorInitial}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Creator</p>
                <p className="truncate text-sm font-semibold text-on-surface">{creatorName}</p>
              </div>
              <span className="material-symbols-outlined ml-auto text-on-surface-variant">arrow_forward_ios</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-sm font-bold text-on-surface-variant">
                {creatorInitial}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Creator</p>
                <p className="truncate text-sm font-semibold text-on-surface">{creatorName}</p>
              </div>
            </div>
          )
        }
        primaryAction={{
          label: 'Play Challenge',
          icon: 'play_arrow',
          onClick: () => navigate(`/play/${challenge.id}`),
        }}
        secondaryAction={
          isCreator
            ? {
                label: 'Edit',
                icon: 'edit',
                onClick: () => navigate(`/create/${challenge.id}`),
              }
            : undefined
        }
        statLines={[
          `${challenge.questionCount} questions`,
          `Estimated ${Math.max(1, challenge.estimatedMinutes || 1)} minutes`,
        ]}
      />

      {shouldShowAdminVerification && (
        <section className="rounded-lg bg-surface-container-low p-4 lg:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">Admin</p>
              <p className="text-sm text-on-surface-variant">Verification controls</p>
            </div>
            <AnimatedButton
              type="button"
              variant="secondary"
              className="px-4 py-2 text-sm"
              disabled={verificationMutationPending}
              onClick={() => {
                void toggleVerification()
              }}
            >
              {isVerified ? 'Unverify Challenge' : 'Verify Challenge'}
            </AnimatedButton>
          </div>
          {verificationMutationError && (
            <p className="mt-3 text-sm text-error">{verificationMutationError}</p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-on-surface">Description</h2>
        <div className="rounded-lg bg-surface-container-low p-5">
          <p className="text-on-surface-variant leading-relaxed">
            {challenge.description}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-on-surface">Challenge Settings</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 text-sm">
            <span className="material-symbols-outlined text-primary">timer</span>
            <span className="text-on-surface">
              {challenge.settings.timer ? `Timer: ${challenge.settings.timerSeconds}s` : 'Timer: Off'}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 text-sm">
            <span className="material-symbols-outlined text-primary">leaderboard</span>
            <span className="text-on-surface">Leaderboard: {challenge.settings.leaderboard ? 'On' : 'Off'}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 text-sm">
            <span className="material-symbols-outlined text-primary">chat</span>
            <span className="text-on-surface">Comments: {challenge.commentsEnabled ? 'On' : 'Off'}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 text-sm">
            <span className="material-symbols-outlined text-primary">track_changes</span>
            <span className="text-on-surface">Confidence system: {challenge.confidenceEnabled ? 'On' : 'Off'}</span>
          </div>
        </div>

        {isVerified && (
          <LeaderboardInfoNote>
            Verified challenges can contribute ranked points.
          </LeaderboardInfoNote>
        )}
      </section>

      <section ref={leaderboardRef}>
        <Leaderboard
          title="Challenge leaderboard"
          description="Best scores for this challenge."
          note={
            isVerified && challenge.settings.leaderboard
              ? 'Verified challenge. Results can contribute ranked points.'
              : isVerified
                ? 'Verified challenge, but leaderboard is off for new runs.'
                : 'This challenge has its own leaderboard. Only verified challenges contribute ranked points.'
          }
          filters={{
            value: timeFilter,
            options: timeFilterOptions,
            onChange: setTimeFilter,
          }}
          rows={challengeLeaderboard}
          currentUserId={currentUser?.id}
          metricLabel="Score"
          emptyStateTitle="No scores yet for this challenge."
          emptyStateDescription="Play a run to appear on the leaderboard."
          limit={10}
        />
      </section>
    </div>
  )
}
