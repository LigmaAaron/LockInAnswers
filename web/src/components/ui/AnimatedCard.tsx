import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type AnimatedCardProps = {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  as?: 'div' | 'button'
  onClick?: () => void
}

export function AnimatedCard({ children, className, style, as = 'div', onClick }: AnimatedCardProps) {
  const baseClassName = `rounded-lg bg-surface-container text-on-surface ${className ?? ''}`

  if (as === 'button') {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        whileHover={{ y: -3 }}
        className={baseClassName}
        style={style}
        onClick={onClick}
      >
        {children}
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -3 }}
      className={baseClassName}
      style={style}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
