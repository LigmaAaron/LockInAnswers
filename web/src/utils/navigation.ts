import type { NavigateFunction } from 'react-router-dom'

const BACK_NAV_LOG_KEY = 'lia-back-nav-log'
const ROUTE_HISTORY_KEY = 'lia-route-history'

type RouteHistoryEntry = {
  path: string
  at: string
}

type BackNavLogEntry = {
  from: string
  at: string
  historyLength: number
  action: 'back' | 'skip' | 'fallback'
}

type BackNavigationOptions = {
  skipPathPrefixes?: string[]
}

const readRouteHistory = () => {
  try {
    const existing = sessionStorage.getItem(ROUTE_HISTORY_KEY)
    return existing ? (JSON.parse(existing) as RouteHistoryEntry[]) : []
  } catch {
    return []
  }
}

const writeRouteHistory = (entries: RouteHistoryEntry[]) => {
  try {
    sessionStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(entries.slice(-50)))
  } catch {
    // Keep navigation resilient even if sessionStorage is unavailable.
  }
}

export const recordRouteVisit = (path: string) => {
  const history = readRouteHistory()
  const lastEntry = history[history.length - 1]

  if (lastEntry?.path === path) {
    return
  }

  writeRouteHistory([
    ...history,
    {
      path,
      at: new Date().toISOString(),
    },
  ])
}

const isSkippedPath = (path: string, skipPathPrefixes?: string[]) =>
  !!skipPathPrefixes?.some((prefix) => path.startsWith(prefix))

const findSafeBackPath = (currentPath: string, skipPathPrefixes?: string[]) => {
  const history = readRouteHistory()
  const currentIndex = [...history].reverse().findIndex((entry) => entry.path === currentPath)

  if (currentIndex < 0) {
    return null
  }

  const startIndex = history.length - 1 - currentIndex
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const candidate = history[index]
    if (!candidate || candidate.path === currentPath || isSkippedPath(candidate.path, skipPathPrefixes)) {
      continue
    }

    return candidate.path
  }

  return null
}

const appendBackNavLog = (entry: BackNavLogEntry) => {
  try {
    const existing = localStorage.getItem(BACK_NAV_LOG_KEY)
    const parsed = existing ? (JSON.parse(existing) as BackNavLogEntry[]) : []
    const next = [entry, ...parsed].slice(0, 50)
    localStorage.setItem(BACK_NAV_LOG_KEY, JSON.stringify(next))
  } catch {
    // Keep navigation resilient even if localStorage is unavailable.
  }
}

export const navigateBackWithLog = (
  navigate: NavigateFunction,
  fromPath: string,
  fallbackPath: string,
  options?: BackNavigationOptions,
) => {
  const canGoBack = window.history.length > 1
  const safeBackPath = findSafeBackPath(fromPath, options?.skipPathPrefixes)
  const shouldSkip = !!safeBackPath && safeBackPath !== fromPath
  const action: BackNavLogEntry['action'] = shouldSkip ? 'skip' : canGoBack ? 'back' : 'fallback'
  const entry: BackNavLogEntry = {
    from: fromPath,
    at: new Date().toISOString(),
    historyLength: window.history.length,
    action,
  }

  appendBackNavLog(entry)
  console.info('[LIA] Back navigation', entry)

  if (shouldSkip && safeBackPath) {
    navigate(safeBackPath, { replace: true })
    return
  }

  if (canGoBack) {
    navigate(-1)
    return
  }

  navigate(fallbackPath)
}
