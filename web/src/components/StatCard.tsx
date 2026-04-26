import { AnimatedCard } from './ui/AnimatedCard'

type StatCardProps = {
  label: string
  value: string
  description?: string
  clickable?: boolean
  onClick?: () => void
}

export function StatCard({ label, value, description, clickable = false, onClick }: StatCardProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-on-surface-variant">{label}</p>
      <p className="text-4xl font-bold tracking-tighter text-on-surface">{value}</p>
      {description && <p className="text-sm text-outline">{description}</p>}
    </>
  )

  if (clickable && onClick) {
    return (
      <AnimatedCard
        as="button"
        onClick={onClick}
        className="w-full p-8 flex flex-col justify-between gap-3 text-left hover:bg-surface-container-high transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {content}
      </AnimatedCard>
    )
  }

  return (
    <AnimatedCard className="p-8 flex flex-col justify-between gap-3">
      {content}
    </AnimatedCard>
  )
}
