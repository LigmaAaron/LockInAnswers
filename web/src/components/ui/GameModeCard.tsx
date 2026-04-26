import { motion } from 'framer-motion'

type GameModeCardProps = {
  title: string
  description: string
  icon: string
  isSelected: boolean
  onClick: () => void
}

export function GameModeCard({
  title,
  description,
  icon,
  isSelected,
  onClick,
}: GameModeCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg p-4 text-left transition-colors ${
        isSelected
          ? 'bg-surface-container-high'
          : 'bg-surface-container-low hover:bg-surface-container-high'
      }`}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-4">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
        <div className="flex-1">
          <h3 className="text-base font-bold text-on-surface">{title}</h3>
          <p className="text-sm text-on-surface-variant mt-1">{description}</p>
        </div>
        <span
          className={`material-symbols-outlined transition-colors ${
            isSelected ? 'text-primary' : 'text-outline'
          }`}
          style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
        >
          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
        </span>
      </div>
    </motion.button>
  )
}
