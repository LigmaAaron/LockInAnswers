import { AnimatedCard } from '../ui/AnimatedCard'
import { AnimatedButton } from '../ui/AnimatedButton'
import { ModeBadge } from '../ui/ModeBadge'
import { ProgressBar } from '../ui/ProgressBar'
import type { Challenge } from '../../types/models'

type ChallengeCardProps = {
  challenge: Challenge
  onClick: () => void
  onActionClick: () => void
  actionLabel: string
  statusBadge?: string
  metadataText?: string
  progress?: {
    completed: number
    total: number
  }
}

export function ChallengeCard({
  challenge,
  onClick,
  onActionClick,
  actionLabel,
  statusBadge,
  metadataText,
  progress,
}: ChallengeCardProps) {
  const isVerified = (challenge.is_verified ?? challenge.isVerified) === true
  const showProgress = !!progress && progress.total > 0
  const percent = showProgress
    ? Math.round((Math.max(0, Math.min(progress.completed, progress.total)) / progress.total) * 100)
    : 0

  return (
    <AnimatedCard
      className="bg-surface-container p-6 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="font-bold text-lg">{challenge.title}</h4>
          <div className="mt-1.5 mb-3 flex flex-wrap items-center gap-2">
            <ModeBadge mode={challenge.mode} />
            {isVerified && (
              <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-tertiary-container/25 text-tertiary">
                Verified
              </span>
            )}
            {statusBadge && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded bg-secondary-container text-on-secondary-container">
                {statusBadge}
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-sm">{challenge.description}</p>
        </div>
        {showProgress && <span className="text-primary font-bold">{percent}%</span>}
      </div>

      {showProgress ? (
        <div className="space-y-2">
          <ProgressBar value={percent} />
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>
              {progress.completed}/{progress.total} questions completed
            </span>
            <span>Est. {Math.max(1, challenge.estimatedMinutes || 1)}m</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex justify-between text-xs text-on-surface-variant">
          <span>{challenge.questionCount} Questions</span>
          <span>Est. {Math.max(1, challenge.estimatedMinutes || 1)}m</span>
        </div>
      )}

      {metadataText && <p className="mt-2 text-xs text-on-surface-variant">{metadataText}</p>}

      <div className="mt-5">
        <AnimatedButton
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onActionClick()
          }}
          className="w-full px-4 py-2.5 font-bold"
        >
          {actionLabel}
        </AnimatedButton>
      </div>
    </AnimatedCard>
  )
}
