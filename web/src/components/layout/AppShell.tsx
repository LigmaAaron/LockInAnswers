import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { recordRouteVisit } from '../../utils/navigation'
import { GameplayHudProvider } from '../../context/GameplayHudContext'

export function AppShell() {
  const location = useLocation()

  useEffect(() => {
    recordRouteVisit(location.pathname)
  }, [location.pathname])

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
