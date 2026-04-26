type AppEnv = ImportMetaEnv & {
  VITE_APP_URL?: string
}

export function getAppOrigin() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  const env = import.meta.env as AppEnv
  return env.VITE_APP_URL ?? ''
}

export function getAuthCallbackUrl() {
  const origin = getAppOrigin().replace(/\/$/, '')
  return `${origin}/auth/callback`
}
