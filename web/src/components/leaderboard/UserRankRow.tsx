import { LeaderboardRow } from './LeaderboardRow'
import type { LeaderboardRowData } from '../../utils/leaderboards'

type UserRankRowProps = {
  row: LeaderboardRowData
  metricLabel: string
  label?: string
}

export function UserRankRow({ row, metricLabel, label = 'Your rank' }: UserRankRowProps) {
  return (
    <section className="space-y-2 pt-4 border-t border-outline-variant/15">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">{label}</p>
      <LeaderboardRow
        rank={row.rank}
        username={row.username}
        metricLabel={metricLabel}
        metricValue={new Intl.NumberFormat().format(Math.round(row.value))}
        secondaryText={row.secondaryText}
        isCurrentUser
      />
    </section>
  )
}