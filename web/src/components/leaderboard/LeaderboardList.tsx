import { LeaderboardRow } from './LeaderboardRow'
import { UserRankRow } from './UserRankRow'
import type { LeaderboardRowData } from '../../utils/leaderboards'

type LeaderboardListProps = {
  rows: LeaderboardRowData[]
  metricLabel: string
  emptyStateTitle: string
  emptyStateDescription: string
  currentUserId?: string
  currentUserLabel?: string
  limit?: number
}

export function LeaderboardList({
  rows,
  metricLabel,
  emptyStateTitle,
  emptyStateDescription,
  currentUserId,
  currentUserLabel,
  limit,
}: LeaderboardListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-surface-container-low px-4 py-5">
        <p className="text-sm font-semibold text-on-surface">{emptyStateTitle}</p>
        <p className="mt-1 text-sm text-on-surface-variant">{emptyStateDescription}</p>
      </div>
    )
  }

  const visibleRows = typeof limit === 'number' ? rows.slice(0, Math.max(0, limit)) : rows
  const currentUserRow = currentUserId ? rows.find((row) => row.userId === currentUserId) : undefined
  const currentUserVisible = currentUserRow
    ? visibleRows.some((row) => row.userId === currentUserRow.userId)
    : false

  return (
    <div className="space-y-4">
      <div className="divide-y divide-outline-variant/10 rounded-lg overflow-hidden">
        {visibleRows.map((row) => (
          <LeaderboardRow
            key={row.userId}
            rank={row.rank}
            username={row.username}
            metricLabel={metricLabel}
            metricValue={new Intl.NumberFormat().format(Math.round(row.value))}
            secondaryText={row.secondaryText}
            isCurrentUser={row.userId === currentUserId}
          />
        ))}
      </div>

      {!currentUserVisible && currentUserRow && (
        <UserRankRow
          row={currentUserRow}
          metricLabel={metricLabel}
          label={currentUserLabel}
        />
      )}
    </div>
  )
}