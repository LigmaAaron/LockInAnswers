import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { useAuth } from './context/AuthContext'
import { routeUserAfterAuth } from './lib/profiles'
import { AuthPage } from './pages/AuthPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { ChallengeDetailPage } from './pages/ChallengeDetailPage'
import { CreateQuizPage } from './pages/CreateQuizPage'
import { DailyReviewPage } from './pages/DailyReviewPage'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { PlayQuizPage } from './pages/PlayQuizPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { StyleGuidePage } from './pages/StyleGuidePage'

function FullscreenAuthLoading() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-surface-container border border-outline-variant/20 p-8 text-center">
        <p className="text-sm text-on-surface-variant">Loading your session...</p>
      </div>
    </div>
  )
}

function ProtectedRoute() {
  const { currentUser, authLoading } = useAuth()
  if (authLoading) {
    return <FullscreenAuthLoading />
  }
  if (!currentUser) {
    return <Navigate to="/auth" replace />
  }
  return <Outlet />
}

function OnboardingGuard() {
  const { currentUser, authLoading } = useAuth()
  if (authLoading) {
    return <FullscreenAuthLoading />
  }

  // If user has not completed onboarding, redirect to onboarding
  if (currentUser && !currentUser.has_completed_onboarding) {
    return <Navigate to="/onboarding" replace />
  }
  
  return <Outlet />
}

function PublicOnlyRoute() {
  const { currentUser, authLoading } = useAuth()
  if (authLoading) {
    return <FullscreenAuthLoading />
  }

  if (currentUser) {
    return <Navigate to={routeUserAfterAuth(currentUser)} replace />
  }
  return <Outlet />
}

function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/styleguide" element={<StyleGuidePage />} />
        
        <Route element={<OnboardingGuard />}>
          <Route element={<AppShell />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/create/:challengeId" element={<CreateQuizPage />} />
            <Route path="/create" element={<CreateQuizPage />} />
            <Route path="/challenge/:challengeId" element={<ChallengeDetailPage />} />
            <Route path="/play/:challengeId" element={<PlayQuizPage />} />
            <Route path="/redemption" element={<DailyReviewPage />} />
            <Route path="/leaderboards" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App
