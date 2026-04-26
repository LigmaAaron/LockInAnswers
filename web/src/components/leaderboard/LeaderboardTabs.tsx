type LeaderboardOption = {
  value: string
  label: string
}

type LeaderboardTabsProps = {
  value: string
  options: LeaderboardOption[]
  onChange: (value: string) => void
  ariaLabel?: string
}

export function LeaderboardTabs({ value, options, onChange, ariaLabel = 'Leaderboard scope' }: LeaderboardTabsProps) {
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