type ProgressBarProps = {
  value: number
  className?: string
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const bounded = Math.max(0, Math.min(100, value))

  return (
    <div
      className={`w-full h-1 bg-surface-container-highest rounded-full overflow-hidden ${className ?? ''}`}
      aria-label={`Progress ${Math.round(bounded)} percent`}
    >
      <div className="h-full bg-primary" style={{ width: `${bounded}%` }}></div>
    </div>
  )
}
