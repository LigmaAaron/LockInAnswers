import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type AppearProps = {
  children: ReactNode
  className?: string
  delay?: number
}

export function Appear({ children, className, delay = 0 }: AppearProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}