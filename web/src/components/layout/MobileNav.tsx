import { House, Flame, Trophy, PlusSquare } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

const navItems = [
  { path: '/home', label: 'Home', icon: House },
  { path: '/redemption', label: 'Review', icon: Flame },
  { path: '/leaderboards', label: 'Boards', icon: Trophy },
  { path: '/create', label: 'Create', icon: PlusSquare },
]

export function MobileNav() {
  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-outline-variant/20 grid grid-cols-4"
    >
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
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
