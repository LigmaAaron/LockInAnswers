import { motion } from 'framer-motion'

type ProfileDropdownProps = {
  onProfileClick: () => void
  onSettingsClick: () => void
}

const menuItems = [
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings',
  },
] as const

export function ProfileDropdown({
  onProfileClick,
  onSettingsClick,
}: ProfileDropdownProps) {
  const onSelect = (key: (typeof menuItems)[number]['key']) => {
    if (key === 'profile') {
      onProfileClick()
      return
    }

    onSettingsClick()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-[200px] rounded-xl border border-outline-variant/20 bg-surface-container p-2 shadow-sm"
      role="menu"
      aria-label="Profile menu"
      tabIndex={-1}
    >
      <div className="flex flex-col gap-1">
        {menuItems.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            autoFocus={item.key === 'profile'}
            onClick={() => onSelect(item.key)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-on-surface transition-[transform,background-color] duration-200 hover:bg-surface-container-high active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}