import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AuthCallbackPage() {
  const { completeOAuthCallback } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completing Google sign-in...')

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        const result = await completeOAuthCallback()
        if (!active) {
          return
        }

        if (!result.ok) {
          const fallbackMessage = 'Google sign-in failed. Please try again.'
          const nextMessage = result.message ?? fallbackMessage
          setMessage(nextMessage)

          if (import.meta.env.DEV) {
            console.debug('[auth] callback redirect failure path', { nextMessage })
          }

          window.setTimeout(() => {
            navigate('/auth', {
              replace: true,
              state: {
                authMessage: nextMessage,
              },
            })
          }, 600)

          return
        }

        const destination = result.nextPath ?? '/home'
        if (import.meta.env.DEV) {
          console.debug('[auth] callback redirect success path', { destination })
        }

        setMessage('Google sign-in complete. Redirecting...')
        navigate(destination, { replace: true })
      } catch (error) {
        if (!active) {
          return
        }

        const nextMessage = 'Google sign-in failed unexpectedly. Please try again.'
        if (import.meta.env.DEV) {
          console.debug('[auth] callback redirect exception', {
            error: error instanceof Error ? error.message : 'unknown error',
          })
        }

        setMessage(nextMessage)
        window.setTimeout(() => {
          navigate('/auth', {
            replace: true,
            state: {
              authMessage: nextMessage,
            },
          })
        }, 600)
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [completeOAuthCallback, navigate])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-surface-container border border-outline-variant/20 p-8 text-center">
        <p className="text-sm text-on-surface-variant">{message}</p>
      </div>
    </div>
  )
}
