type SummaryStatCardProps = {
  label: string
  value: string
  helperText?: string
}

export function SummaryStatCard({ label, value, helperText }: SummaryStatCardProps) {
  return (
    <article className="min-h-[148px] rounded-lg bg-surface-container-high p-5 flex flex-col gap-2">
      <p className="text-sm font-medium text-on-surface-variant">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-on-surface leading-tight">{value}</p>
      {helperText && (
        <p className="mt-auto max-w-[24ch] text-xs leading-snug text-outline">{helperText}</p>
      )}
    </article>
  )
}
