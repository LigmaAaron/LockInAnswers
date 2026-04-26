import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Bell, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { useGameplayHud } from '../../context/GameplayHudContext'
import { AnimatedButton } from '../ui/AnimatedButton'
import { LiveScoreDisplay } from '../ui/LiveScoreDisplay'
import { ProfileDropdown } from './ProfileDropdown'
import { getUserInitial } from '../../utils/userIdentity'

export function Topbar() {
  const navigate = useNavigate()
  const { currentUser, signOut } = useAuth()
  const { uiConfig } = useAppData()
  const { currentScore } = useGameplayHud()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const profileTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return
    }

    const onDocumentPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (!profileMenuRef.current?.contains(target)) {
        setIsProfileMenuOpen(false)
      }
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
        profileTriggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onDocumentPointerDown)
    document.addEventListener('touchstart', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeyDown)

    return () => {
      document.removeEventListener('mousedown', onDocumentPointerDown)
      document.removeEventListener('touchstart', onDocumentPointerDown)
      document.removeEventListener('keydown', onDocumentKeyDown)
    }
  }, [isProfileMenuOpen])

  const closeProfileMenu = () => {
    setIsProfileMenuOpen(false)
  }

  const onProfileSelect = () => {
    closeProfileMenu()
    navigate('/profile')
  }

  const onSettingsSelect = () => {
    closeProfileMenu()
    navigate('/settings')
  }

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant/20 flex justify-between items-center h-16 px-6"
    >
      <div className="flex items-center gap-6 min-w-0">
        <button
          type="button"
          className="inline-flex items-center justify-center h-10 px-3 rounded-lg bg-transparent text-2xl font-black italic text-on-surface tracking-tight hover:bg-surface-container-low transition-[transform,background-color] duration-200 active:scale-95"
          onClick={() => navigate('/home')}
          aria-label="Go to home page"
        >
          {uiConfig.brandName}
        </button>
        <label className="hidden md:flex items-center gap-2 h-10 px-3 rounded-lg bg-surface-container border border-outline-variant/20 min-w-[280px]">
          <Search size={16} className="text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent w-full outline-none text-sm text-on-surface placeholder:text-on-surface-variant"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <LiveScoreDisplay score={currentScore} />
        <AnimatedButton
          type="button"
          variant="primary"
          className="hidden sm:inline-flex items-center gap-2 h-10 px-4 font-semibold text-sm"
          onClick={() => navigate('/create')}
        >
          <Plus size={16} />
          {uiConfig.topbarCtaLabel}
        </AnimatedButton>
        <button className="w-10 h-10 inline-flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-lg transition-[transform,background-color] duration-200 active:scale-95">
          <Bell size={16} />
        </button>
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            ref={profileTriggerRef}
            className="w-8 h-8 rounded-lg bg-surface-container-high overflow-hidden cursor-pointer flex items-center justify-center text-on-surface-variant font-bold text-sm"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            aria-label="Open profile menu"
          >
            {getUserInitial(currentUser)}
          </button>

          <AnimatePresence>
            {isProfileMenuOpen && (
              <ProfileDropdown
                onProfileClick={onProfileSelect}
                onSettingsClick={onSettingsSelect}
              />
            )}
          </AnimatePresence>
        </div>
        <button 
          className="material-symbols-outlined text-on-surface-variant p-2 hover:bg-surface-container rounded-lg transition-[transform,background-color] duration-200 active:scale-95"
          onClick={async () => {
            await signOut()
            navigate('/auth')
          }}
        >
          logout
        </button>
      </div>
    </motion.header>
  )
}
