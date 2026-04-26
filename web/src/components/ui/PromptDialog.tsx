import type { ReactNode } from 'react'

type PromptDialogProps = {
  open: boolean
  title: string
  description: string
  children: ReactNode
}

export function PromptDialog({ open, title, description, children }: PromptDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-background/70 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container rounded-lg border border-outline-variant/20 p-6">
        <h3 className="text-lg font-bold text-on-surface mb-2">{title}</h3>
        <p className="text-sm text-on-surface-variant mb-4">{description}</p>
        <div className="flex gap-3 justify-end">{children}</div>
      </div>
    </div>
  )
}
