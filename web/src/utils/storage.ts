export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const value = localStorage.getItem(key)
      return value ? (JSON.parse(value) as T) : fallback
    } catch {
      return fallback
    }
  },
  set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value))
  },
}

export const makeId = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)
