export type StatDefinition = {
  key: string
  label: string
  description: string
  format: (value: number) => string
}

export const STATS_CONFIG = {
  totalPoints: {
    key: 'totalPoints',
    label: 'Total Points',
    description: 'Total points earned across completed challenges',
    format: (value: number) => `${Math.round(value).toLocaleString()} pts`,
  },
  accuracy: {
    key: 'accuracy',
    label: 'Accuracy',
    description: 'How often you answer correctly',
    format: (value: number) => `${Math.round(value * 100)}%`,
  },
  averageConfidence: {
    key: 'averageConfidence',
    label: 'Avg Confidence',
    description: 'Your average confidence level',
    format: (value: number) => `${value.toFixed(1)} / 5`,
  },
  confidenceAccuracy: {
    key: 'confidenceAccuracy',
    label: 'Confidence Accuracy',
    description: 'How often your confidence matches correctness',
    format: (value: number) => `${Math.round(value * 100)}%`,
  },
  gamesPlayed: {
    key: 'gamesPlayed',
    label: 'Games Played',
    description: 'Total challenges completed',
    format: (value: number) => `${value}`,
  },
} satisfies Record<string, StatDefinition>

export type StatKey = keyof typeof STATS_CONFIG