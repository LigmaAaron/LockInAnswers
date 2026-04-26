import type { ReactNode } from 'react'

type LeaderboardInfoNoteProps = {
  children: ReactNode
}

export function LeaderboardInfoNote({ children }: LeaderboardInfoNoteProps) {
  return (
    <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm leading-6 text-on-surface-variant">
      {children}
    </div>
  )
}