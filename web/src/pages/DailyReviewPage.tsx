import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DetailHeroCard } from '../components/challenge/DetailHeroCard'
import { AnimatedCard } from '../components/ui/AnimatedCard'
import { BackButton } from '../components/ui/BackButton'
import { getRedemptionQueue, sortRedemptionQueue } from '../utils/redemption'

export function DailyReviewPage() {
  const navigate = useNavigate()
  const queue = useMemo(() => sortRedemptionQueue(getRedemptionQueue()), [])
  const challengeCount = useMemo(
    () => new Set(queue.map((item) => item.challengeId)).size,
    [queue],
  )
  const highPriorityCount = useMemo(
    () => queue.filter((item) => item.highConfidenceMistake).length,
    [queue],
  )
  const estimatedMinutes = Math.max(1, Math.ceil(queue.length / 4))

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-10">
      <BackButton fallbackPath="/home" />
      <DetailHeroCard
        title="Redemption Session"
        description="Review missed questions in a focused run. Start when ready."
        badge={
          <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] bg-primary-container/15 text-primary">
            Priority Session
          </span>
        }
        coverIcon="history_edu"
        coverLabel="Recovery queue"
        primaryAction={{
          label: queue.length > 0 ? 'Play Redemption' : 'Queue Empty',
          icon: queue.length > 0 ? 'play_arrow' : 'task_alt',
          onClick: () => {
            if (queue.length > 0) {
              navigate('/play/redemption')
            }
          },
          disabled: queue.length === 0,
        }}
        statLines={[
          `${queue.length} queued questions`,
          `Estimated ${estimatedMinutes} minutes`,
        ]}
      />

      <AnimatedCard className="p-6 lg:p-8">
        <h2 className="text-lg font-bold text-on-surface mb-5">Redemption Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low">
            <span className="material-symbols-outlined text-primary">quiz</span>
            <span className="text-on-surface">Queued questions: {queue.length}</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low">
            <span className="material-symbols-outlined text-primary">dataset</span>
            <span className="text-on-surface">Source challenges: {challengeCount}</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low">
            <span className="material-symbols-outlined text-primary">priority_high</span>
            <span className="text-on-surface">
              High-confidence misses: {highPriorityCount}
            </span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low">
            <span className="material-symbols-outlined text-primary">schedule</span>
            <span className="text-on-surface">Timer: Off</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low md:col-span-2">
            <span className="material-symbols-outlined text-primary">track_changes</span>
            <span className="text-on-surface">Confidence system: On</span>
          </div>
        </div>
      </AnimatedCard>

      {queue.length === 0 && (
        <AnimatedCard className="p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant">task_alt</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Nothing queued right now</h3>
          <p className="text-on-surface-variant">
            Missed questions will appear here after you finish challenge runs.
          </p>
        </AnimatedCard>
      )}
    </div>
  )
}
