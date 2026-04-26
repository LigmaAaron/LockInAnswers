import type { ReactNode } from 'react'
import { AnimatedButton } from '../ui/AnimatedButton'
import { AnimatedCard } from '../ui/AnimatedCard'

type HeroAction = {
  label: string
  onClick: () => void
  icon?: string
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

type DetailHeroCardProps = {
  title: string
  description?: string
  badge?: ReactNode
  metadata?: ReactNode
  coverLabel?: string
  coverIcon?: string
  primaryAction: HeroAction
  secondaryAction?: HeroAction
  statLines: string[]
}

export function DetailHeroCard({
  title,
  description,
  badge,
  metadata,
  coverLabel = 'Cover placeholder',
  coverIcon = 'image',
  primaryAction,
  secondaryAction,
  statLines,
}: DetailHeroCardProps) {
  return (
    <AnimatedCard className="p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-5">
          <div className="w-full h-56 rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center">
            <div className="text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2">{coverIcon}</span>
              <p className="text-sm font-medium">{coverLabel}</p>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-on-surface mb-3">{title}</h1>
            {badge && <div className="mb-4">{badge}</div>}
            {metadata && <div className="mb-4">{metadata}</div>}
            {description && <p className="text-on-surface-variant text-base max-w-3xl">{description}</p>}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-3">
          <AnimatedButton
            type="button"
            variant={primaryAction.variant ?? 'primary'}
            className="w-full py-3"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.icon && (
              <span className="material-symbols-outlined text-[18px] mr-2">{primaryAction.icon}</span>
            )}
            {primaryAction.label}
          </AnimatedButton>

          {secondaryAction && (
            <AnimatedButton
              type="button"
              variant={secondaryAction.variant ?? 'secondary'}
              className="w-full py-3"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
            >
              {secondaryAction.icon && (
                <span className="material-symbols-outlined text-[18px] mr-2">{secondaryAction.icon}</span>
              )}
              {secondaryAction.label}
            </AnimatedButton>
          )}

          <div className="mt-2 p-4 rounded-lg bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface-variant">
            {statLines.map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </AnimatedCard>
  )
}