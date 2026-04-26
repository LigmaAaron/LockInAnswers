import { useMemo, useState } from 'react'
import { Leaderboard } from '../components/Leaderboard'
import { Appear } from '../components/ui/Appear'
import { LeaderboardInfoNote } from '../components/leaderboard/LeaderboardInfoNote'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { buildRankedLeaderboard, type LeaderboardTimeFilter } from '../utils/leaderboards'

type LeaderboardScope = 'global' | 'friends'

const scopeOptions: Array<{ value: LeaderboardScope; label: string }> = [
  { value: 'global', label: 'Global' },
  { value: 'friends', label: 'Friends' },
]

const timeFilterOptions: Array<{ value: LeaderboardTimeFilter; label: string }> = [
  { value: 'all-time', label: 'All-time' },
  { value: 'this-week', label: 'This week' },
]

export function LeaderboardPage() {
  const { challenges, quizRuns } = useAppData()
  const { currentUser } = useAuth()
  const [scope, setScope] = useState<LeaderboardScope>('global')
  const [timeFilter, setTimeFilter] = useState<LeaderboardTimeFilter>('all-time')

  const rankedRows = useMemo(
    () => buildRankedLeaderboard(challenges, quizRuns, timeFilter),
    [challenges, quizRuns, timeFilter],
  )

  const rows = scope === 'global' ? rankedRows : []
  const emptyState =
    scope === 'global'
      ? {
          title: 'No ranked scores yet.',
          description: 'Complete verified challenges to earn ranked points.',
        }
      : {
          title: 'Friends leaderboard coming soon.',
          description: 'Friends leaderboard will appear here once you add friends.',
        }

  return (
    <Appear className="w-full max-w-6xl mx-auto space-y-6 pb-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold font-headline text-on-background">Leaderboards</h1>
      </header>

      <LeaderboardInfoNote>
        Only ranked points count here. Ranked points are earned from verified challenges.
      </LeaderboardInfoNote>

      <Leaderboard
        title={scope === 'global' ? 'Global rankings' : 'Friends rankings'}
        description={scope === 'global' ? 'One row per user. Best ranked points win.' : 'Invite friends to compare progress.'}
        tabs={{
          value: scope,
          options: scopeOptions,
          onChange: (value) => setScope(value as LeaderboardScope),
        }}
        filters={{
          value: timeFilter,
          options: timeFilterOptions,
          onChange: setTimeFilter,
        }}
        rows={rows}
        metricLabel="Ranked points"
        emptyStateTitle={emptyState.title}
        emptyStateDescription={emptyState.description}
        currentUserId={currentUser?.id}
        currentUserLabel="Your rank"
        limit={10}
      />
    </Appear>
  )
}
