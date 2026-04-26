import type { ChallengeMode, ChallengeSettings } from '../types/models'

export const defaultChallengeSettings: ChallengeSettings = {
  timer: false,
  leaderboard: false,
  timerSeconds: 10,
}

export const modePresetDefaults: Record<
  ChallengeMode,
  { settings: ChallengeSettings; trackMistakesForRedemption: boolean }
> = {
  study: {
    settings: {
      timer: false,
      leaderboard: false,
      timerSeconds: 10,
    },
    trackMistakesForRedemption: true,
  },
  competitive: {
    settings: {
      timer: true,
      leaderboard: true,
      timerSeconds: 10,
    },
    trackMistakesForRedemption: false,
  },
  casual: {
    settings: {
      timer: false,
      leaderboard: false,
      timerSeconds: 10,
    },
    trackMistakesForRedemption: false,
  },
}

export const getPresetDefaults = (mode: ChallengeMode) => modePresetDefaults[mode]

export const mergeChallengeSettings = (
  settings?: Partial<ChallengeSettings> & {
    timerEnabled?: boolean
    leaderboardEnabled?: boolean
  },
): ChallengeSettings => {
  if (!settings) {
    return defaultChallengeSettings
  }

  return {
    ...defaultChallengeSettings,
    ...settings,
    timer: settings.timer ?? settings.timerEnabled ?? defaultChallengeSettings.timer,
    leaderboard:
      settings.leaderboard ?? settings.leaderboardEnabled ?? defaultChallengeSettings.leaderboard,
  }
}
