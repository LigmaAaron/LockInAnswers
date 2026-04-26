import { motion } from 'framer-motion'

type StepIndicatorProps = {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const progressPercent = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-on-surface-variant font-semibold">Step Progress</span>
        <span className="text-xs font-semibold text-on-surface">Step {currentStep} of {totalSteps}</span>
      </div>

      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: 'spring', stiffness: 160, damping: 24 }}
        />
      </div>
    </div>
  )
}
