import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js'
import type { Profile } from '../types/models'
import { setSoundMuted } from '../utils/audioPreferences'
import { ensureUserProfile, routeUserAfterAuth, toProfilePatch, updateUserProfile } from '../lib/profiles'
import { supabase } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  currentUser: Profile | null
  isAuthenticated: boolean
  authLoading: boolean
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string; nextPath?: string }>
  signUp: (payload: {
    username: string
    email: string
    password: string
  }) => Promise<{ ok: boolean; message?: string; nextPath?: string; requiresEmailConfirmation?: boolean }>
  signInWithGoogle: () => Promise<{ ok: boolean; message?: string; redirectTo?: string }>
  completeOAuthCallback: () => Promise<{ ok: boolean; message?: string; nextPath?: string }>
  signOut: () => Promise<void>
  updateCurrentUser: (patch: Partial<Profile>) => Promise<{ ok: boolean; message?: string }>
  getPostAuthPath: () => string
}

const AuthContext = createContext<AuthContextValue | null>(null)

function debugAuthLog(message: string, details?: Record<string, unknown>) {
  if (!import.meta.env.DEV) {
    return
  }

  if (details) {
    console.debug(`[auth] ${message}`, details)
    return
  }

  console.debug(`[auth] ${message}`)
}

function toAuthMessage(message: string) {
  const lowered = message.toLowerCase()

  if (lowered.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }
  if (lowered.includes('user already registered')) {
    return 'An account with this email already exists.'
  }
  if (lowered.includes('email not confirmed')) {
    return 'Check your inbox and confirm your email before signing in.'
  }
  if (lowered.includes('password')) {
    return 'Password does not meet the requirements.'
  }
  if (lowered.includes('network')) {
    return 'Network issue. Please try again.'
  }

  return 'Authentication failed. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const currentUserRef = useRef<Profile | null>(null)
  const initializedProfileUserIdRef = useRef<string | null>(null)
  const inFlightProfileLoadsRef = useRef<Map<string, Promise<Profile>>>(new Map())

  currentUserRef.current = currentUser

  const loadProfileForAuthUser = useCallback(
    async (authUser: SupabaseAuthUser, source: string, optionalUsername?: string) => {
      const userId = authUser.id
      const existingLoad = inFlightProfileLoadsRef.current.get(userId)

      if (existingLoad) {
        debugAuthLog('profile init join existing request', { userId, source })
        return existingLoad
      }

      debugAuthLog('profile init request start', { userId, source })
      const loadPromise = ensureUserProfile(authUser, optionalUsername)
        .then((ensuredUser) => {
          initializedProfileUserIdRef.current = userId
          debugAuthLog('profile init request success', {
            userId,
            source,
            has_completed_onboarding: ensuredUser.has_completed_onboarding,
          })
          return ensuredUser
        })
        .catch((error) => {
          if (initializedProfileUserIdRef.current === userId) {
            initializedProfileUserIdRef.current = null
          }
          debugAuthLog('profile init request failed', {
            userId,
            source,
            error: error instanceof Error ? error.message : 'unknown error',
          })
          throw error
        })
        .finally(() => {
          inFlightProfileLoadsRef.current.delete(userId)
        })

      inFlightProfileLoadsRef.current.set(userId, loadPromise)
      return loadPromise
    },
    [],
  )

  useEffect(() => {
    let active = true

    const syncFromSession = async (nextSession: Session | null, source: string) => {
      if (!active) {
        return
      }

      setSession(nextSession)
      debugAuthLog('sync session', {
        hasSession: !!nextSession,
        userId: nextSession?.user?.id,
        source,
      })

      if (!nextSession?.user) {
        initializedProfileUserIdRef.current = null
        inFlightProfileLoadsRef.current.clear()
        setCurrentUser(null)
        setAuthLoading(false)
        return
      }

      const userId = nextSession.user.id
      if (
        initializedProfileUserIdRef.current === userId &&
        currentUserRef.current?.id === userId
      ) {
        debugAuthLog('sync session skipped profile fetch (already initialized)', {
          userId,
          source,
        })
        setAuthLoading(false)
        return
      }

      setAuthLoading(true)

      try {
        const ensuredUser = await loadProfileForAuthUser(nextSession.user, `sync:${source}`)
        if (!active) {
          return
        }
        setCurrentUser(ensuredUser)
      } catch (error) {
        if (!active) {
          return
        }
        debugAuthLog('sync session profile load failed', {
          userId,
          source,
          error: error instanceof Error ? error.message : 'unknown error',
        })
        setCurrentUser(null)
      } finally {
        if (active) {
          setAuthLoading(false)
        }
      }
    }

    const bootstrap = async () => {
      setAuthLoading(true)
      debugAuthLog('bootstrap session start')
      const { data } = await supabase.auth.getSession()
      debugAuthLog('bootstrap session read', {
        hasSession: !!data.session,
        userId: data.session?.user?.id,
      })
      await syncFromSession(data.session, 'bootstrap')
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      debugAuthLog('auth state change', {
        event,
        hasSession: !!nextSession,
        userId: nextSession?.user?.id,
      })

      window.setTimeout(() => {
        void syncFromSession(nextSession, `auth-event:${event}`)
      }, 0)
    })

    void bootstrap()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfileForAuthUser])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    setSoundMuted(currentUser.mute_sound_effects)
  }, [currentUser])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { ok: false, message: toAuthMessage(error.message) }
    }

    const authUser = data.user
    if (!authUser) {
      return { ok: false, message: 'Sign in failed. Please try again.' }
    }

    try {
      const ensuredUser = await loadProfileForAuthUser(authUser, 'signIn')
      setCurrentUser(ensuredUser)
      return { ok: true, nextPath: routeUserAfterAuth(ensuredUser) }
    } catch {
      return { ok: false, message: 'Signed in, but we could not load your profile. Please try again.' }
    }
  }

  const signUp = async ({ username, email, password }: { username: string; email: string; password: string }) => {
    const normalizedUsername = username.trim()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizedUsername,
        },
      },
    })

    if (error) {
      return { ok: false, message: toAuthMessage(error.message) }
    }

    const authUser = data.user
    if (!authUser) {
      return { ok: false, message: 'Sign up failed. Please try again.' }
    }

    try {
      const ensuredUser = await loadProfileForAuthUser(authUser, 'signUp', normalizedUsername)
      const requiresEmailConfirmation = !data.session
      setCurrentUser(ensuredUser)

      return {
        ok: true,
        nextPath: requiresEmailConfirmation ? undefined : routeUserAfterAuth(ensuredUser),
        requiresEmailConfirmation,
      }
    } catch {
      return { ok: false, message: 'Account created, but profile setup failed. Please sign in again.' }
    }
  }

  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}/auth/callback`
    debugAuthLog('google sign in click', { redirectTo })

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) {
      return { ok: false, message: toAuthMessage(error.message) }
    }

    return { ok: true, redirectTo }
  }

  const completeOAuthCallback = useCallback(async () => {
    setAuthLoading(true)
    debugAuthLog('oauth callback start', {
      url: window.location.href,
      path: window.location.pathname,
      query: window.location.search,
      hash: window.location.hash,
    })

    const params = new URLSearchParams(window.location.search)
    const authCode = params.get('code')

    const existingSessionResult = await supabase.auth.getSession()
    if (existingSessionResult.error) {
      debugAuthLog('oauth callback getSession precheck failed', {
        error: existingSessionResult.error.message,
      })
    }

    if (existingSessionResult.data.session?.user) {
      debugAuthLog('oauth callback found existing session before code exchange', {
        userId: existingSessionResult.data.session.user.id,
      })

      setSession(existingSessionResult.data.session)

      try {
        const ensuredUser = await loadProfileForAuthUser(
          existingSessionResult.data.session.user,
          'oauth-callback:existing-session',
        )
        setCurrentUser(ensuredUser)
        const nextPath = routeUserAfterAuth(ensuredUser)
        debugAuthLog('oauth callback complete from existing session', {
          userId: ensuredUser.id,
          nextPath,
        })
        setAuthLoading(false)
        return { ok: true, nextPath }
      } catch (profileError) {
        debugAuthLog('oauth callback profile ensure failed from existing session', {
          userId: existingSessionResult.data.session.user.id,
          error: profileError instanceof Error ? profileError.message : 'unknown error',
        })
        setAuthLoading(false)
        return {
          ok: false,
          message: 'Signed in, but we could not load your profile. Please try again.',
        }
      }
    }

    if (authCode) {
      debugAuthLog('oauth callback code detected, exchanging for session')
      const { error } = await supabase.auth.exchangeCodeForSession(authCode)
      if (error) {
        debugAuthLog('oauth code exchange failed', {
          error: error.message,
        })
        setAuthLoading(false)
        return {
          ok: false,
          message: toAuthMessage(error.message),
        }
      }
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      debugAuthLog('oauth callback getSession failed', { error: error.message })
      setAuthLoading(false)
      return { ok: false, message: toAuthMessage(error.message) }
    }

    if (!data.session?.user) {
      debugAuthLog('oauth callback no session after redirect')
      setAuthLoading(false)
      return { ok: false, message: 'Sign in did not complete. Please try Google sign-in again.' }
    }

    setSession(data.session)

    try {
      const ensuredUser = await loadProfileForAuthUser(
        data.session.user,
        'oauth-callback:post-exchange',
      )
      setCurrentUser(ensuredUser)
      const nextPath = routeUserAfterAuth(ensuredUser)
      debugAuthLog('oauth callback complete', {
        userId: ensuredUser.id,
        nextPath,
      })
      setAuthLoading(false)
      return { ok: true, nextPath }
    } catch (profileError) {
      debugAuthLog('oauth callback profile ensure failed', {
        userId: data.session.user.id,
        error: profileError instanceof Error ? profileError.message : 'unknown error',
      })
      setAuthLoading(false)
      return {
        ok: false,
        message: 'Signed in, but we could not load your profile. Please try again.',
      }
    }
  }, [loadProfileForAuthUser])

  const signOut = async () => {
    await supabase.auth.signOut()
    initializedProfileUserIdRef.current = null
    inFlightProfileLoadsRef.current.clear()
    setSession(null)
    setCurrentUser(null)
    setAuthLoading(false)
  }

  const updateCurrentUser = async (patch: Partial<Profile>) => {
    if (!currentUser) {
      return { ok: false, message: 'No active user session.' }
    }

    try {
      await updateUserProfile(currentUser.id, toProfilePatch(patch))
      setCurrentUser((prev) => (prev ? { ...prev, ...patch } : prev))
      return { ok: true }
    } catch {
      return { ok: false, message: 'Unable to save profile changes. Please try again.' }
    }
  }

  const getPostAuthPath = () => (currentUser ? routeUserAfterAuth(currentUser) : '/auth')

  return (
    <AuthContext.Provider
      value={{
        session,
        currentUser,
        isAuthenticated: !!session,
        authLoading,
        signIn,
        signUp,
        signInWithGoogle,
        completeOAuthCallback,
        signOut,
        updateCurrentUser,
        getPostAuthPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
