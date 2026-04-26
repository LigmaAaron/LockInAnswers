import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import type { Profile } from '../types/models'
import { supabase } from './supabase'

type ProfilePatch = Partial<Pick<Profile, 'username' | 'has_completed_onboarding' | 'privacy' | 'vibe' | 'interests' | 'show_highlights' | 'mute_sound_effects'>>

const PROFILE_TABLE = 'profiles'

function sanitizeUsername(value: string) {
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
  const condensed = normalized.replace(/_+/g, '_').replace(/^_+|_+$/g, '')
  return condensed.slice(0, 24) || 'user'
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6)
}

function deriveFallbackUsername(authUser: SupabaseAuthUser) {
  const metadata = authUser.user_metadata ?? {}

  const candidate =
    metadata.username ??
    metadata.user_name ??
    metadata.preferred_username ??
    metadata.name ??
    authUser.email?.split('@')[0] ??
    'user'

  return `${sanitizeUsername(String(candidate))}_${randomSuffix()}`
}

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('*')
    .eq('id', userId)
    .maybeSingle<Profile>()

  if (error) {
    throw error
  }

  return data
}

async function createProfile(authUser: SupabaseAuthUser, optionalUsername?: string) {
  const username = sanitizeUsername(optionalUsername ?? deriveFallbackUsername(authUser))

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .insert({
      id: authUser.id,
      username,
      role: 'user',
      has_completed_onboarding: false,
      privacy: 'friends',
      vibe: 'competitive',
      interests: [],
      show_highlights: true,
      mute_sound_effects: false,
    })
    .select('*')
    .single<Profile>()

  if (!error) {
    return data
  }

  // If the profile was created in a concurrent request, load and reuse it.
  const existing = await fetchUserProfile(authUser.id)
  if (existing) {
    return existing
  }

  throw error
}

export async function ensureUserProfile(authUser: SupabaseAuthUser, optionalUsername?: string) {
  const profile = await fetchUserProfile(authUser.id)
  const ensured = profile ?? (await createProfile(authUser, optionalUsername))

  return ensured
}

export async function updateUserProfile(userId: string, patch: ProfilePatch) {
  if (Object.keys(patch).length === 0) {
    return
  }

  const { error } = await supabase
    .from(PROFILE_TABLE)
    .update(patch)
    .eq('id', userId)

  if (error) {
    throw error
  }
}

export function toProfilePatch(patch: Partial<Profile>): ProfilePatch {
  const mapped: ProfilePatch = {}

  if (patch.username !== undefined) mapped.username = patch.username
  if (patch.has_completed_onboarding !== undefined) {
    mapped.has_completed_onboarding = patch.has_completed_onboarding
  }
  if (patch.privacy !== undefined) mapped.privacy = patch.privacy
  if (patch.vibe !== undefined) mapped.vibe = patch.vibe
  if (patch.interests !== undefined) mapped.interests = patch.interests
  if (patch.show_highlights !== undefined) mapped.show_highlights = patch.show_highlights
  if (patch.mute_sound_effects !== undefined) mapped.mute_sound_effects = patch.mute_sound_effects

  return mapped
}

export function routeUserAfterAuth(user: Pick<Profile, 'has_completed_onboarding'>) {
  return user.has_completed_onboarding ? '/home' : '/onboarding'
}
