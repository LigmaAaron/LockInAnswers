import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { AnimatedButton } from '../components/ui/AnimatedButton'

type Mode = 'signin' | 'signup'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { signIn, signUp, signInWithGoogle, authLoading } = useAuth()

  const stateMessage =
    typeof location.state === 'object' &&
    location.state &&
    'authMessage' in location.state &&
    typeof (location.state as { authMessage?: unknown }).authMessage === 'string'
      ? (location.state as { authMessage: string }).authMessage
      : ''

  const oauthError = useMemo(() => {
    const errorDescription = searchParams.get('error_description')
    if (!errorDescription) {
      return ''
    }

    return decodeURIComponent(errorDescription.replace(/\+/g, ' '))
  }, [searchParams])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    if (mode === 'signin') {
      const result = await signIn(email, password)
      if (!result.ok) {
        setMessage(result.message ?? 'Sign in failed.')
        setIsSubmitting(false)
        return
      }

      navigate(result.nextPath ?? '/home')
      setIsSubmitting(false)
      return
    }

    if (!username.trim()) {
      setMessage('Username is required.')
      setIsSubmitting(false)
      return
    }

    const result = await signUp({ username, email, password })
    if (!result.ok) {
      setMessage(result.message ?? 'Sign up failed.')
      setIsSubmitting(false)
      return
    }

    if (result.requiresEmailConfirmation) {
      setMode('signin')
      setMessage('Account created. Check your email to confirm your account, then sign in.')
      setIsSubmitting(false)
      return
    }

    navigate(result.nextPath ?? '/onboarding')
    setIsSubmitting(false)
  }

  const onGoogleClick = async () => {
    setMessage('')
    setIsSubmitting(true)

    const result = await signInWithGoogle()
    if (import.meta.env.DEV) {
      console.debug('[auth] google sign-in result', result)
    }

    if (!result.ok) {
      setMessage(result.message ?? 'Google sign in failed.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <motion.form
        className="w-full max-w-md rounded-lg bg-surface-container border border-outline-variant/20 p-8 space-y-5"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35 }}
        onSubmit={onSubmit}
      >
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Lock In Answers</h1>
          <p className="text-sm text-on-surface-variant mt-1">Answer. Commit. Get judged.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-surface-container-high p-1 rounded-lg">
          <button
            type="button"
            className={`rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'}`}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'}`}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        {mode === 'signup' && (
          <label className="block text-sm text-on-surface-variant">
            Username
            <input className="mt-1 w-full h-11 rounded-lg bg-surface-container-high border border-outline-variant/20 px-3 text-on-surface outline-none focus:border-primary" value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>
        )}

        <label className="block text-sm text-on-surface-variant">
          Email
          <input
            className="mt-1 w-full h-11 rounded-lg bg-surface-container-high border border-outline-variant/20 px-3 text-on-surface outline-none focus:border-primary"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm text-on-surface-variant">
          Password
          <input
            className="mt-1 w-full h-11 rounded-lg bg-surface-container-high border border-outline-variant/20 px-3 text-on-surface outline-none focus:border-primary"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {(message || oauthError || stateMessage) && <p className="text-sm text-error">{message || oauthError || stateMessage}</p>}

        <AnimatedButton type="submit" className="w-full h-11" disabled={isSubmitting || authLoading}>
          {mode === 'signin' ? 'Enter Workspace' : 'Create Account'}
        </AnimatedButton>

        <div className="flex items-center gap-3 text-on-surface-variant text-xs">
          <span className="h-px bg-outline-variant/30 flex-1" />
          <span>or</span>
          <span className="h-px bg-outline-variant/30 flex-1" />
        </div>

        <AnimatedButton
          type="button"
          variant="secondary"
          className="w-full h-11 gap-2"
          onClick={onGoogleClick}
          disabled={isSubmitting || authLoading}
        >
          <span className="font-bold">G</span>
          Continue with Google
        </AnimatedButton>
      </motion.form>
    </div>
  )
}
