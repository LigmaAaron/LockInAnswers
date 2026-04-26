import type { ReactNode } from 'react'
import { LeaderboardFilters } from './leaderboard/LeaderboardFilters'
import { LeaderboardInfoNote } from './leaderboard/LeaderboardInfoNote'
import { LeaderboardList } from './leaderboard/LeaderboardList'
import { LeaderboardTabs } from './leaderboard/LeaderboardTabs'
import type { LeaderboardRowData, LeaderboardTimeFilter } from '../utils/leaderboards'

type ControlGroup<T extends string> = {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}

type LeaderboardProps = {
  title: string
  description?: string
  note?: string
  tabs?: ControlGroup<string>
  filters?: ControlGroup<LeaderboardTimeFilter>
  rows: LeaderboardRowData[]
  metricLabel: string
  emptyStateTitle: string
  emptyStateDescription: string
  currentUserId?: string
  currentUserLabel?: string
  limit?: number
  footer?: ReactNode
}

export function Leaderboard({
  title,
  description,
  note,
  tabs,
  filters,
  rows,
  metricLabel,
  emptyStateTitle,
  emptyStateDescription,
  currentUserId,
  currentUserLabel,
  limit,
  footer,
}: LeaderboardProps) {
  return (
    <section className="space-y-4 rounded-lg border border-outline-variant/15 bg-surface-container p-5 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface">{title}</h2>
          {description && <p className="mt-1 text-sm text-on-surface-variant">{description}</p>}
        </div>
        {footer}
      </div>

      {note && <LeaderboardInfoNote>{note}</LeaderboardInfoNote>}

      {(tabs || filters) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {tabs ? (
            <LeaderboardTabs
              value={tabs.value}
              options={tabs.options}
              onChange={tabs.onChange}
            />
          ) : (
            <div />
          )}

          {filters ? (
            <LeaderboardFilters
              value={filters.value}
              options={filters.options}
              onChange={filters.onChange}
            />
          ) : null}
        </div>
      )}

      <LeaderboardList
        rows={rows}
        metricLabel={metricLabel}
        emptyStateTitle={emptyStateTitle}
        emptyStateDescription={emptyStateDescription}
        currentUserId={currentUserId}
        currentUserLabel={currentUserLabel}
        limit={limit}
      />
    </section>
  )
}