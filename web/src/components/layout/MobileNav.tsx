import { House, Flame, Trophy, PlusSquare } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useAppData } from '../../context/AppDataContext'

const mobileNavOrder = ['home', 'redemption', 'leaderboards', 'create'] as const

const iconMap = {
  home: House,
  redemption: Flame,
  leaderboards: Trophy,
  create: PlusSquare,
} as const

export function MobileNav() {
  const { uiConfig } = useAppData()

  const navItems = useMemo(
    () =>
      mobileNavOrder
        .map((key) => uiConfig.sidebarItems.find((item) => item.key === key))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [uiConfig.sidebarItems],
  )

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-outline-variant/20 grid grid-cols-4"
    >
      {navItems.map((item) => {
        const Icon = iconMap[item.key as keyof typeof iconMap] ?? House
        return (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `py-2.5 text-[11px] font-medium flex flex-col items-center gap-1 ${
                isActive ? 'text-primary' : 'text-on-surface-variant'
              }`
            }
          >
            <Icon size={18} />
            {item.label}
          </NavLink>
        )
      })}
    </motion.nav>
  )
}
