import type { ChallengeMode } from '../../types/models'

type ModeBadgeProps = {
  mode: ChallengeMode
}

const badgeStyles: Record<ChallengeMode, string> = {
  study: 'bg-primary-container/15 text-primary',
  competitive: 'bg-tertiary-container/25 text-tertiary',
  casual: 'bg-surface-container-highest text-on-surface-variant',
}

const modeLabels: Record<ChallengeMode, string> = {
  study: 'Study',
  competitive: 'Competitive',
  casual: 'Casual',
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase ${badgeStyles[mode]}`}
    >
      {modeLabels[mode]}
    </span>
  )
}