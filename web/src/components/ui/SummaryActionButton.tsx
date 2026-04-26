import { AnimatedButton } from './AnimatedButton'

type SummaryActionButtonProps = {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
}

const variantClassName: Record<NonNullable<SummaryActionButtonProps['variant']>, string> = {
  primary: 'px-6 py-3 font-bold',
  secondary: 'px-6 py-3 text-on-surface font-medium',
  ghost: 'px-6 py-3 text-on-surface-variant',
}

export function SummaryActionButton({ label, onClick, variant = 'primary' }: SummaryActionButtonProps) {
  return (
    <AnimatedButton
      onClick={onClick}
      variant={variant}
      className={variantClassName[variant]}
    >
      {label}
    </AnimatedButton>
  )
}
