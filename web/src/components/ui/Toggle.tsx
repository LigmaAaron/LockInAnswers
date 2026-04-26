import { motion } from 'framer-motion'

type ToggleProps = {
  id?: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ id, label, description, checked, onChange, disabled = false }: ToggleProps) {
  return (
    <div
      className={`flex items-start gap-4 py-4 px-4 rounded-lg bg-surface-container-low transition-colors ${
        disabled
          ? 'opacity-60'
          : ''
      }`}
    >
      <div className="flex-1">
        <label htmlFor={id} className="block text-sm font-semibold text-on-surface cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-xs text-on-surface-variant mt-1">{description}</p>
        )}
      </div>

      <motion.button
        id={id}
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-surface-container-highest'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        <motion.div
          className="absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-on-primary shadow-sm"
          initial={false}
          animate={{
            x: checked ? 20 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />
      </motion.button>
    </div>
  )
}
