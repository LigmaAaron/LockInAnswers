import { storage } from './storage'

const AUDIO_PREFS_KEY = 'lia-audio-preferences'

type AudioPreferences = {
  muted: boolean
}

const defaults: AudioPreferences = {
  muted: false,
}

export const getAudioPreferences = () =>
  storage.get<AudioPreferences>(AUDIO_PREFS_KEY, defaults)

export const isSoundMuted = () => getAudioPreferences().muted

export const setSoundMuted = (muted: boolean) => {
  storage.set(AUDIO_PREFS_KEY, {
    ...getAudioPreferences(),
    muted,
  })
}
