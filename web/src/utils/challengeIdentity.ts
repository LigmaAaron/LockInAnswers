export const STARTER_CHALLENGE_ID_MAP = {
  'starter-space': '7cb6c7e7-9eb0-4cf7-9a13-2f6d9d9c0001',
  'starter-stress': '7cb6c7e7-9eb0-4cf7-9a13-2f6d9d9c0002',
  'starter-history': '7cb6c7e7-9eb0-4cf7-9a13-2f6d9d9c0003',
  'starter-apush-period-8-9': '7cb6c7e7-9eb0-4cf7-9a13-2f6d9d9c0004',
} as const

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
  return UUID_PATTERN.test(value)
}

export function normalizeChallengeId(id: string) {
  return STARTER_CHALLENGE_ID_MAP[id as keyof typeof STARTER_CHALLENGE_ID_MAP] ?? id
}
