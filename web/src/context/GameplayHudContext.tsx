import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type GameplayHudContextValue = {
  currentScore: number
  setCurrentScore: (score: number) => void
}

const GameplayHudContext = createContext<GameplayHudContextValue | undefined>(undefined)

export function GameplayHudProvider({ children }: { children: ReactNode }) {
  const [currentScore, setScoreState] = useState<number>(0)
  const setCurrentScore = useCallback((score: number) => {
    setScoreState(score)
  }, [])

  const value = useMemo<GameplayHudContextValue>(
    () => ({
      currentScore,
      setCurrentScore,
    }),
    [currentScore, setCurrentScore],
  )

  return <GameplayHudContext.Provider value={value}>{children}</GameplayHudContext.Provider>
}

export function useGameplayHud() {
  const context = useContext(GameplayHudContext)

  if (!context) {
    throw new Error('useGameplayHud must be used within a GameplayHudProvider')
  }

  return context
}