import type { Profile } from '../types/models'

export function getUserInitial(user: Profile | null): string {
  if (!user) return '?'

  if (user.username) {
    return user.username.charAt(0).toUpperCase()
  }

  return '?'
}

export function getUserDisplayName(user: Profile | null): string {
  if (!user) return 'Unknown'

  return user.username || 'User'
}

/**
 * Get the user identity for challenge creator metadata.
 * Prefers username as the primary identity field for created challenges.
 */
export function getUserIdentity(user: Profile | null): string {
  if (!user) return 'Unknown'

  // Use username as the primary identity for challenges
  if (user.username) {
    return user.username
  }

  // Fallback to user id
  return user.id
}

