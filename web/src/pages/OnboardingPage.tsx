import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { StepIndicator } from '../components/ui/StepIndicator'
import { GameModeCard } from '../components/ui/GameModeCard'
import { Toggle } from '../components/ui/Toggle'
import { AnimatedButton } from '../components/ui/AnimatedButton'

const interestOptions = [
  { label: 'Science', icon: 'biotech' },
  { label: 'History', icon: 'history_edu' },
  { label: 'Tech', icon: 'code' },
  { label: 'Pop Culture', icon: 'movie' },
  { label: 'Geography', icon: 'public' },
  { label: 'Art', icon: 'palette' },
  { label: 'Business', icon: 'business_center' },
  { label: 'Health', icon: 'favorite' },
  { label: 'Space', icon: 'rocket_launch' },
]

type OnboardingStep = 'profile' | 'gamemode' | 'interests' | 'privacy'

export function OnboardingPage() {
  const { currentUser, updateCurrentUser } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile')
  const [username, setUsername] = useState(currentUser?.username ?? '')
  const [vibe, setVibe] = useState(currentUser?.vibe ?? 'competitive')
  const [interests, setInterests] = useState<string[]>(currentUser?.interests ?? ['Science'])
  const [allowActivityVisible, setAllowActivityVisible] = useState(true)
  const [allowFriendsFind, setAllowFriendsFind] = useState(true)
  const [isStepNavigating, setIsStepNavigating] = useState(false)
  const [message, setMessage] = useState('')

  const stepOrder: OnboardingStep[] = ['profile', 'gamemode', 'interests', 'privacy']
  const currentStepIndex = stepOrder.indexOf(currentStep)

  const navigateToStep = (targetStep: OnboardingStep) => {
    if (isStepNavigating || targetStep === currentStep) {
      return
    }

    setIsStepNavigating(true)
    setCurrentStep(targetStep)
    window.setTimeout(() => {
      setIsStepNavigating(false)
    }, 320)
  }

  const toggleInterest = (value: string) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    )
  }

  const handleNext = () => {
    if (currentStepIndex < stepOrder.length - 1) {
      navigateToStep(stepOrder[currentStepIndex + 1]!)
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      navigateToStep(stepOrder[currentStepIndex - 1]!)
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isStepNavigating) {
      return
    }

    const result = await updateCurrentUser({
      username: username || 'user',
      vibe: vibe as 'chill' | 'competitive' | 'chaos',
      interests,
      privacy: allowFriendsFind ? 'friends' : 'private',
      show_highlights: allowActivityVisible,
      mute_sound_effects: currentUser?.mute_sound_effects ?? false,
      has_completed_onboarding: true,
    })

    if (!result.ok) {
      setMessage(result.message ?? 'Unable to save onboarding right now.')
      return
    }

    navigate('/home')
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'profile':
        return (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-on-surface mb-2">Create Your Profile</h2>
              <p className="text-on-surface-variant">You can update these details later in your Profile Settings.</p>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-on-surface mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose your unique username"
                  className="w-full bg-surface-container-low border border-outline-variant/15 rounded-lg py-3 px-4 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </motion.div>
        )

      case 'gamemode':
        return (
          <motion.div
            key="gamemode"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-on-surface mb-2">Choose Your Game Vibe</h2>
              <p className="text-on-surface-variant">Pick the intensity that matches your learning style.</p>
            </div>

            <div className="space-y-4">
              <GameModeCard
                title="Chill"
                description="Low stakes, no ranking pressure. Perfect for unwinding after a long day."
                icon="self_improvement"
                isSelected={vibe === 'chill'}
                onClick={() => setVibe('chill')}
              />
              <GameModeCard
                title="Competitive"
                description="Ranked matchmaking with performance tracking and seasonal rewards."
                icon="emoji_events"
                isSelected={vibe === 'competitive'}
                onClick={() => setVibe('competitive')}
              />
              <GameModeCard
                title="Chaos"
                description="Random modifiers every round. Anything can happen in this high-energy mode."
                icon="bolt"
                isSelected={vibe === 'chaos'}
                onClick={() => setVibe('chaos')}
              />
            </div>
          </motion.div>
        )

      case 'interests':
        return (
          <motion.div
            key="interests"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-on-surface mb-2">Select Your Interests</h2>
              <p className="text-on-surface-variant">Choose the topics you're curious about. This helps LIA personalize your learning paths.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {interestOptions.map((interest) => {
                const isSelected = interests.includes(interest.label)
                return (
                  <motion.button
                    key={interest.label}
                    type="button"
                    onClick={() => toggleInterest(interest.label)}
                    className={`relative p-4 rounded-lg border-2 transition-all text-center ${
                      isSelected
                        ? 'border-primary bg-primary/15'
                        : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/40'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="material-symbols-outlined text-2xl mb-2 text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {interest.icon}
                    </span>
                    <div className="text-sm font-semibold text-on-surface">{interest.label}</div>
                    {isSelected && (
                      <motion.div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-tertiary flex items-center justify-center"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        <span className="material-symbols-outlined text-[12px] text-on-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check
                        </span>
                      </motion.div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )

      case 'privacy':
        return (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-on-surface mb-2">Privacy & Visibility</h2>
              <p className="text-on-surface-variant">Secure your presence on the platform.</p>
            </div>

            <div className="space-y-4">
              <Toggle
                label="Show Activity & Scores"
                description="Allow others to see your recent activity, high scores, and community contributions."
                checked={allowActivityVisible}
                onChange={setAllowActivityVisible}
              />
              <Toggle
                label="Let Friends Find You"
                description="Let friends find your profile by searching for your registered email address."
                checked={allowFriendsFind}
                onChange={setAllowFriendsFind}
              />
            </div>

            <div className="mt-8 p-4 rounded-lg bg-surface-container-low border border-tertiary/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">lock</span>
              <p className="text-xs text-on-surface-variant">
                Your data is encrypted. You can change these settings at any time from your account dashboard.
              </p>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={onSubmit} className="min-h-screen flex items-center justify-center p-6 w-full bg-background">
      <motion.main className="w-full max-w-2xl bg-surface-container-low p-8 lg:p-12 rounded-xl">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStepIndex + 1} totalSteps={4} />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="pt-8 flex items-center justify-between gap-4 border-t border-outline-variant/15 mt-8">
          <button 
            type="button"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isStepNavigating}
            className="text-on-surface-variant text-sm font-medium hover:text-on-surface disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 transition-colors"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/home')}
              disabled={isStepNavigating}
              className="text-on-surface-variant text-sm font-medium hover:text-on-surface px-4 py-2 transition-colors"
            >
              Skip for now
            </button>

            {currentStepIndex === stepOrder.length - 1 ? (
              <AnimatedButton type="submit" variant="primary" disabled={isStepNavigating}>
                Finish Setup
              </AnimatedButton>
            ) : (
              <AnimatedButton type="button" variant="primary" onClick={handleNext} disabled={isStepNavigating}>
                Continue
              </AnimatedButton>
            )}
          </div>
        </div>
        {message && <p className="mt-3 text-sm text-error">{message}</p>}
      </motion.main>
    </form>
  )
}
