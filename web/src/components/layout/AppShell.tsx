import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { recordRouteVisit } from '../../utils/navigation'
import { GameplayHudProvider } from '../../context/GameplayHudContext'
import { useAppData } from '../../context/AppDataContext'

const getPageLabelFromPath = (pathname: string): string | null => {
  if (pathname.startsWith('/home')) return 'Home'
  if (pathname.startsWith('/library')) return 'Library'
  if (pathname.startsWith('/create/')) return 'Edit Challenge'
  if (pathname.startsWith('/create')) return 'Create Challenge'
  if (pathname.startsWith('/challenge/')) return 'Challenge Details'
  if (pathname.startsWith('/play/')) return 'Play Quiz'
  if (pathname.startsWith('/redemption')) return 'Revise'
  if (pathname.startsWith('/leaderboards')) return 'Leaderboards'
  if (pathname.startsWith('/profile')) return 'Profile'
  if (pathname.startsWith('/settings')) return 'Settings'
  return null
}

export function AppShell() {
  const location = useLocation()
  const { uiConfig } = useAppData()

  useEffect(() => {
    recordRouteVisit(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    const brandName = uiConfig.brandName?.trim() || 'MCQ Hub'
    const pageLabel = getPageLabelFromPath(location.pathname)
    document.title = pageLabel ? `${brandName} | ${pageLabel}` : brandName
  }, [location.pathname, uiConfig.brandName])

  return (
    <GameplayHudProvider>
      <div className="bg-background text-on-surface min-h-screen flex flex-col">
        <Topbar />
        <div className="flex flex-1 pt-16">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-12 pb-24 md:pb-12 overflow-y-auto bg-surface">
            <Outlet />
          </main>
        </div>
        <MobileNav />
      </div>
    </GameplayHudProvider>
  )
}
