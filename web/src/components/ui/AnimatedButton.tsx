import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

type AnimatedButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function AnimatedButton({
  children,
  variant = 'primary',
  className,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const variantClass = {
    primary:
      'bg-primary-container text-on-primary-container hover:brightness-105',
    secondary:
      'bg-surface-container-high text-primary hover:bg-surface-container',
    ghost:
      'bg-transparent text-primary hover:bg-surface-container-low shadow-none',
  }[variant]

  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -1, scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 font-semibold transition-[transform,filter,background-color,color] duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${className ?? ''}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  )
}
