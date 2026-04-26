import { STATS_CONFIG } from '../constants/statsConfig'
import { StatCard } from './StatCard'

type StatsSectionProps = {
  stats: Record<string, number>
  keys: string[]
  clickable?: boolean
  onStatCardClick?: (statKey: string) => void
}

export function StatsSection({ stats, keys, clickable = false, onStatCardClick }: StatsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {keys.map((statKey) => {
        if (!(statKey in STATS_CONFIG)) {
          return null
        }

        const config = STATS_CONFIG[statKey as keyof typeof STATS_CONFIG]

        const value = stats[config.key] ?? 0

        return (
          <StatCard
            key={config.key}
            label={config.label}
            value={config.format(value)}
            description={config.description}
            clickable={clickable}
            onClick={clickable && onStatCardClick ? () => onStatCardClick(config.key) : undefined}
          />
        )
      })}
    </div>
  )
}
