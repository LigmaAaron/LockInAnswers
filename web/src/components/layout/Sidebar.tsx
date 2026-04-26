import { motion } from 'framer-motion'
import { RotateCw } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'

const iconMap: Record<string, string> = {
  home: 'home',
  library: 'library_books',
  leaderboards: 'leaderboard',
  create: 'add_box',
  profile: 'person',
  settings: 'settings',
}

export function Sidebar() {
  const { uiConfig } = useAppData()

  return (
    <aside className="hidden md:flex h-[calc(100vh-64px)] w-64 bg-surface border-r border-outline-variant/15 flex-col py-8 px-4 space-y-2 sticky top-16">
      {uiConfig.sidebarItems.map((item, index) => {
        const iconName = iconMap[item.icon] || 'circle'
        const isBottom = item.icon === 'settings' || item.icon === 'profile'

        return (
          <motion.div
            key={item.key}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.03, duration: 0.25 }}
            className={isBottom && item.icon === 'profile' ? "pt-4 mt-auto border-t border-outline-variant/15" : ""}
          >
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 transition-all rounded-md font-['Lexend'] text-sm ${
                  isActive 
                    ? 'text-on-surface bg-surface-container font-semibold' 
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`
              }
            >
              {item.key === 'redemption' ? (
                <RotateCw size={20} strokeWidth={2} />
              ) : (
                <span className="material-symbols-outlined text-[20px]">{iconName}</span>
              )}
              <span>{item.label}</span>
            </NavLink>
          </motion.div>
        )
      })}
    </aside>
  )
}
