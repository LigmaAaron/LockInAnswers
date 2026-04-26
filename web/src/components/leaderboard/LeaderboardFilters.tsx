type LeaderboardOption<T extends string> = {
  value: T
  label: string
}

type LeaderboardFiltersProps<T extends string> = {
  value: T
  options: LeaderboardOption<T>[]
  onChange: (value: T) => void
  ariaLabel?: string
}

export function LeaderboardFilters<T extends string>({
  value,
  options,
  onChange,
  ariaLabel = 'Leaderboard time filter',
}: LeaderboardFiltersProps<T>) {
  return (
    <div className="inline-flex items-center rounded-xl bg-surface-container-low p-1" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selected
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}