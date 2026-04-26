import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'

type LiveScoreDisplayProps = {
  score: number
}

const formatScore = (value: number) => new Intl.NumberFormat('en-US').format(Math.round(value))

export function LiveScoreDisplay({ score }: LiveScoreDisplayProps) {
  const prefersReducedMotion = useReducedMotion()
  const [displayScore, setDisplayScore] = useState(score)
  const animationFrameRef = useRef<number | null>(null)
  const currentValueRef = useRef(score)
  const pulseKeyRef = useRef(0)
  const [pulseKey, setPulseKey] = useState(0)

  useEffect(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    const startValue = currentValueRef.current

    if (prefersReducedMotion || startValue === score) {
      currentValueRef.current = score
      setDisplayScore(score)
      return undefined
    }

    const delta = score - startValue
    const duration = Math.min(500, Math.max(250, 220 + Math.abs(delta) * 10))
    const startedAt = performance.now()

    pulseKeyRef.current += 1
    setPulseKey(pulseKeyRef.current)

    const updateValue = (now: number) => {
      const elapsed = now - startedAt
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - (1 - progress) ** 3
      const nextValue = startValue + delta * eased

      currentValueRef.current = nextValue
      setDisplayScore(nextValue)

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(updateValue)
        return
      }

      currentValueRef.current = score
      setDisplayScore(score)
      animationFrameRef.current = null
    }

    animationFrameRef.current = window.requestAnimationFrame(updateValue)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [prefersReducedMotion, score])

  return (
    <motion.div
      key={pulseKey}
      initial={false}
      animate={{ scale: pulseKey > 0 ? [1, 1.03, 1] : 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="inline-flex items-center gap-2 h-10 px-3 rounded-lg bg-surface-container whitespace-nowrap"
    >
      <Sparkles size={14} className="text-primary" aria-hidden="true" />
      <span className="text-sm font-bold tabular-nums text-on-surface" aria-label={`Score ${formatScore(displayScore)}`}>
        {formatScore(displayScore)}
      </span>
    </motion.div>
  )
}