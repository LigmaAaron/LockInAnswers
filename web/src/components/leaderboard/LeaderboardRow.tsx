import type { ReactNode } from 'react'

type LeaderboardRowProps = {
  rank: number
  username: string
  metricLabel: string
  metricValue: string
  secondaryText?: string
  isCurrentUser?: boolean
  onClick?: () => void
  suffix?: ReactNode
}

export function LeaderboardRow({
  rank,
  username,
  metricLabel,
  metricValue,
  secondaryText,
  isCurrentUser = false,
  onClick,
  suffix,
}: LeaderboardRowProps) {
  const initial = username.trim().charAt(0).toUpperCase() || '?'

  const rowClassName = `flex items-center gap-3 rounded-lg px-3 py-3 ${
    isCurrentUser
      ? 'bg-primary-container/10 ring-1 ring-primary-container/30'
      : 'bg-surface-container-low'
  } ${onClick ? 'transition-[transform,background-color] duration-200 hover:bg-surface-container-high active:scale-[0.99]' : ''}`

  const content = (
    <>
      <div className="w-10 shrink-0 text-sm font-semibold text-on-surface-variant">#{rank}</div>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
          isCurrentUser ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'
        }`}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-on-surface">{username}</span>
          {isCurrentUser && (
            <span className="inline-flex items-center rounded-lg bg-primary-container/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              You
            </span>
          )}
          {suffix}
        </div>
        {secondaryText && <p className="truncate text-xs text-on-surface-variant">{secondaryText}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">{metricLabel}</p>
        <p className={`text-base font-bold ${isCurrentUser ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          {metricValue}
        </p>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full text-left ${rowClassName}`}>
        {content}
      </button>
    )
  }

  return <div className={rowClassName}>{content}</div>
}