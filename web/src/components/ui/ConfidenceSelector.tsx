import { motion } from 'framer-motion'

type ConfidenceSelectorProps = {
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}

export function ConfidenceSelector({ value, onChange, disabled = false }: ConfidenceSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <motion.button
          key={level}
          type="button"
          disabled={disabled}
          aria-label={`Confidence ${level}`}
          className={`w-11 h-11 rounded-lg text-sm font-semibold transition-colors ${
            value === level
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container'
          }`}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(level)}
        >
          {level}
        </motion.button>
      ))}
    </div>
  )
}
