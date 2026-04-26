import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatsSection } from '../components/StatsSection'
import { Appear } from '../components/ui/Appear'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'
import { ModeBadge } from '../components/ui/ModeBadge'
import { Toggle } from '../components/ui/Toggle'
import { calculateStats } from '../utils/calculateStats'
import { ensurePlayerStatsFromRuns } from '../utils/playerStats'

export function ProfilePage() {
  const { currentUser, updateCurrentUser } = useAuth()
  const { quizRuns, challenges } = useAppData()
  const navigate = useNavigate()
  const playerStats = useMemo(() => ensurePlayerStatsFromRuns(quizRuns), [quizRuns])
  const stats = useMemo(() => calculateStats(playerStats), [playerStats])

  const challengeModeById = new Map(challenges.map((challenge) => [challenge.id, challenge.mode]))

  const personalRuns = quizRuns.filter((entry) => entry.userId === currentUser?.id)
  const totalPoints = personalRuns.reduce((sum, entry) => sum + entry.score, 0)
  const statsWithPoints = useMemo(
    () => ({ ...stats, totalPoints }),
    [stats, totalPoints],
  )

  const onHighlightsChange = async (checked: boolean) => {
    await updateCurrentUser({ show_highlights: checked })
  }

  return (
    <Appear className="w-full max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container text-4xl font-bold">
              {(currentUser?.username || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-on-surface mb-1">{currentUser?.username}</h1>
            <p className="text-on-surface-variant font-medium">Player • Level {Math.max(1, Math.floor(totalPoints / 1000))}</p>
          </div>
        </div>
        <div className="w-full max-w-xs">
          <Toggle
            label="Public Highlights"
            description="Visible to community"
            checked={currentUser?.show_highlights ?? true}
            onChange={onHighlightsChange}
          />
        </div>
      </header>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-on-surface">Player Stats</h2>
        </div>
        <StatsSection
          stats={statsWithPoints}
          keys={['totalPoints', 'accuracy', 'averageConfidence', 'confidenceAccuracy', 'gamesPlayed']}
        />
      </section>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-on-surface">Recently Played</h2>
        </div>
        <div className="space-y-3">
          {personalRuns.length === 0 && (
            <p className="text-on-surface-variant text-sm bg-surface-container-low p-4 rounded-lg">No games played yet. Try a challenge!</p>
          )}
          {personalRuns.slice(0, 3).map((run, i) => (
            <div
              key={i}
              className="group flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-lg cursor-pointer"
              onClick={() => navigate(`/challenge/${run.challengeId}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface-container-highest rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">history</span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">{run.challengeTitle}</h3>
                  <div className="mt-1.5 mb-3">
                    <ModeBadge mode={challengeModeById.get(run.challengeId) ?? 'study'} />
                  </div>
                  <p className="text-sm text-outline">Accuracy: {Math.round((run.correct / run.total) * 100)}%</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-sm font-bold text-tertiary">{run.score}</p>
                  <p className="text-[10px] text-outline uppercase tracking-wider">Score</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate(`/challenge/${run.challengeId}`)
                  }}
                  className="material-symbols-outlined text-outline group-hover:text-primary transition-colors"
                >
                  arrow_forward_ios
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-on-surface mb-6">Learning Momentum</h2>
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10">
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-full aspect-square bg-surface-container rounded-lg"></div>
              <span className="text-[10px] text-outline">MON</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full aspect-square bg-surface-container rounded-lg"></div>
              <span className="text-[10px] text-outline">TUE</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full aspect-square bg-primary-container rounded-lg"></div>
              <span className="text-[10px] text-primary font-bold">WED</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full aspect-square bg-primary-container opacity-60 rounded-lg"></div>
              <span className="text-[10px] text-outline">THU</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full aspect-square bg-primary-container opacity-80 rounded-lg"></div>
              <span className="text-[10px] text-outline">FRI</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full aspect-square bg-surface-container rounded-lg"></div>
              <span className="text-[10px] text-outline">SAT</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full aspect-square bg-surface-container rounded-lg"></div>
              <span className="text-[10px] text-outline">SUN</span>
            </div>
          </div>
        </div>
      </section>
    </Appear>
  )
}
