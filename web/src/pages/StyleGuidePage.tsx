import { motion } from 'framer-motion'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { AnimatedCard } from '../components/ui/AnimatedCard'
import { ConfidenceSelector } from '../components/ui/ConfidenceSelector'
import { StepIndicator } from '../components/ui/StepIndicator'
import { GameModeCard } from '../components/ui/GameModeCard'
import { Toggle } from '../components/ui/Toggle'
import { useState } from 'react'

const colors = {
  'Background & Surface': {
    background: '#111111',
    'surface-container-lowest': '#111111',
    'surface-dim': '#0d0d0d',
    surface: '#111111',
    'surface-bright': '#303030',
    'surface-container': '#1c1c1c',
    'surface-variant': '#1f1f1f',
    'surface-container-low': '#171717',
    'surface-container-high': '#222222',
    'surface-container-highest': '#2a2a2a',
  },
  'Primary Colors': {
    primary: '#2e5bff',
    'primary-container': '#2e5bff',
    'primary-fixed': '#2e5bff',
    'primary-fixed-dim': '#2e5bff',
    'on-primary': '#ffffff',
    'on-primary-container': '#ffffff',
    'on-primary-fixed': '#e8eeff',
    'on-primary-fixed-variant': '#c8d6ff',
  },
  'Secondary Colors': {
    secondary: '#c4c5d9',
    'secondary-container': '#111317',
    'secondary-fixed': '#c4c5d9',
    'secondary-fixed-dim': '#c4c5d9',
    'on-secondary': '#0f1118',
    'on-secondary-container': '#e2e2e8',
    'on-secondary-fixed': '#e2e2e8',
    'on-secondary-fixed-variant': '#c4c5d9',
  },
  'Tertiary Colors': {
    tertiary: '#10b981',
    'tertiary-container': '#065f46',
    'tertiary-fixed': '#10b981',
    'tertiary-fixed-dim': '#10b981',
    'on-tertiary': '#ffffff',
    'on-tertiary-container': '#d8fff1',
    'on-tertiary-fixed': '#d8fff1',
    'on-tertiary-fixed-variant': '#a7f3d0',
  },
  'Error & Status': {
    error: '#ef4444',
    'error-container': '#5a1b1b',
    'on-error': '#ffffff',
    'on-error-container': '#ffe4e4',
  },
  'Text & Outlines': {
    'on-background': '#e2e2e8',
    'on-surface': '#e2e2e8',
    'on-surface-variant': '#c4c5d9',
    outline: '#434656',
    'outline-variant': '#434656',
  },
  'Inverse & Special': {
    'inverse-primary': '#2e5bff',
    'inverse-surface': '#e2e2e8',
    'inverse-on-surface': '#252832',
    'surface-tint': '#2e5bff',
  },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
}

export function StyleGuidePage() {
  const [confidenceValue, setConfidenceValue] = useState<number | null>(3)
  const [toggleState, setToggleState] = useState(true)

  return (
    <div className="min-h-screen bg-background p-8">
      <motion.div
        className="max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-on-surface mb-4">LIA Design System Guide</h1>
          <p className="text-on-surface-variant text-lg">
            Complete reference for all reusable UI components and color variables (Admin View Only)
          </p>
        </div>

        {/* Color System */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-on-surface mb-8 pb-4 border-b border-outline-variant/30">
            Color System
          </h2>
          <p className="text-on-surface-variant mb-8">
            All colors are defined in <code className="bg-surface-container-high px-2 py-1 rounded text-primary">web/tailwind.config.js</code> under <code className="bg-surface-container-high px-2 py-1 rounded text-primary">theme.extend.colors</code>
          </p>

          <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {Object.entries(colors).map(([category, colorMap]) => (
              <motion.div key={category} variants={itemVariants}>
                <h3 className="text-xl font-semibold text-on-surface mb-4">{category}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(colorMap).map(([name, hex]) => (
                    <AnimatedCard
                      key={name}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col h-full">
                        <div
                          className="h-24 w-full"
                          style={{ backgroundColor: hex }}
                        />
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-semibold text-on-surface break-words">
                              {name}
                            </p>
                          </div>
                          <p className="text-xs text-on-surface-variant font-mono">{hex}</p>
                        </div>
                      </div>
                    </AnimatedCard>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* UI Components */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-on-surface mb-8 pb-4 border-b border-outline-variant/30">
            Reusable UI Components
          </h2>

          <motion.div
            className="space-y-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* AnimatedButton */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-on-surface mb-2">AnimatedButton</h3>
                <p className="text-on-surface-variant text-sm mb-4">
                  Animated button component with variants: primary, secondary, ghost
                </p>
                <p className="text-xs text-on-surface-variant mb-4">
                  Location: <code className="bg-surface-container-high px-2 py-1 rounded">src/components/ui/AnimatedButton.tsx</code>
                </p>
              </div>
              <div className="flex gap-4 flex-wrap p-6 bg-surface-container-low rounded-lg">
                <AnimatedButton variant="primary">Primary</AnimatedButton>
                <AnimatedButton variant="secondary">Secondary</AnimatedButton>
                <AnimatedButton variant="ghost">Ghost</AnimatedButton>
              </div>
            </motion.div>

            {/* AnimatedCard */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-on-surface mb-2">AnimatedCard</h3>
                <p className="text-on-surface-variant text-sm mb-4">
                  Animated card container with hover and initial animations
                </p>
                <p className="text-xs text-on-surface-variant mb-4">
                  Location: <code className="bg-surface-container-high px-2 py-1 rounded">src/components/ui/AnimatedCard.tsx</code>
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <AnimatedCard key={i} className="p-6">
                    <h4 className="font-semibold text-on-surface mb-2">Card {i}</h4>
                    <p className="text-sm text-on-surface-variant">
                      Hover to see animation effect
                    </p>
                  </AnimatedCard>
                ))}
              </div>
            </motion.div>

            {/* ConfidenceSelector */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-on-surface mb-2">ConfidenceSelector</h3>
                <p className="text-on-surface-variant text-sm mb-4">
                  Interactive confidence level selector (1-5) with animated buttons
                </p>
                <p className="text-xs text-on-surface-variant mb-4">
                  Location: <code className="bg-surface-container-high px-2 py-1 rounded">src/components/ui/ConfidenceSelector.tsx</code>
                </p>
              </div>
              <div className="p-6 bg-surface-container-low rounded-lg">
                <p className="text-sm text-on-surface-variant mb-4">Selected: {confidenceValue || 'None'}</p>
                <ConfidenceSelector
                  value={confidenceValue}
                  onChange={setConfidenceValue}
                />
              </div>
            </motion.div>

            {/* StepIndicator */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-on-surface mb-2">StepIndicator</h3>
                <p className="text-on-surface-variant text-sm mb-4">
                  Visual progress indicator for multi-step flows
                </p>
                <p className="text-xs text-on-surface-variant mb-4">
                  Location: <code className="bg-surface-container-high px-2 py-1 rounded">src/components/ui/StepIndicator.tsx</code>
                </p>
              </div>
              <div className="p-6 bg-surface-container-low rounded-lg">
                <StepIndicator currentStep={2} totalSteps={4} />
              </div>
            </motion.div>

            {/* GameModeCard */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-on-surface mb-2">GameModeCard</h3>
                <p className="text-on-surface-variant text-sm mb-4">
                  Interactive card for selecting game modes using shared answer-option styling
                </p>
                <p className="text-xs text-on-surface-variant mb-4">
                  Location: <code className="bg-surface-container-high px-2 py-1 rounded">src/components/ui/GameModeCard.tsx</code>
                </p>
              </div>
              <div className="space-y-3 p-6 bg-surface-container-low rounded-lg">
                <GameModeCard
                  title="Chill"
                  description="Low stakes, no ranking pressure."
                  icon="self_improvement"
                  isSelected={false}
                  onClick={() => {}}
                />
                <GameModeCard
                  title="Competitive"
                  description="Ranked matchmaking with performance tracking."
                  icon="emoji_events"
                  isSelected={true}
                  onClick={() => {}}
                />
                <GameModeCard
                  title="Chaos"
                  description="Random modifiers every round."
                  icon="bolt"
                  isSelected={false}
                  onClick={() => {}}
                />
              </div>
            </motion.div>

            {/* Toggle */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-on-surface mb-2">Toggle</h3>
                <p className="text-on-surface-variant text-sm mb-4">
                  Smooth toggle switch with spring animations for boolean settings
                </p>
                <p className="text-xs text-on-surface-variant mb-4">
                  Location: <code className="bg-surface-container-high px-2 py-1 rounded">src/components/ui/Toggle.tsx</code>
                </p>
              </div>
              <div className="p-6 bg-surface-container-low rounded-lg space-y-4">
                <Toggle
                  label="Enable Notifications"
                  description="Get updates about your progress and streaks"
                  checked={toggleState}
                  onChange={setToggleState}
                />
                <Toggle
                  label="Public Profile"
                  description="Let others see your scores and achievements"
                  checked={!toggleState}
                  onChange={() => {}}
                />
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Configuration Reference */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-on-surface mb-8 pb-4 border-b border-outline-variant/30">
            Configuration Reference
          </h2>

          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <AnimatedCard className="p-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4">Color Variables Location</h3>
                <p className="text-on-surface-variant mb-2">
                  <strong>File:</strong> <code className="bg-surface-container-high px-2 py-1 rounded">web/tailwind.config.js</code>
                </p>
                <p className="text-on-surface-variant mb-2">
                  <strong>Path:</strong> <code className="bg-surface-container-high px-2 py-1 rounded">theme.extend.colors</code>
                </p>
                <p className="text-on-surface-variant text-sm">
                  All colors follow Material Design 3 token naming conventions. Use these directly in className attributes.
                </p>
                <p className="text-on-surface-variant text-sm mt-4">
                  Example: <code className="bg-surface-container-high px-2 py-1 rounded">bg-primary</code>, <code className="bg-surface-container-high px-2 py-1 rounded">text-on-surface</code>, <code className="bg-surface-container-high px-2 py-1 rounded">border-outline-variant/20</code>
                </p>
              </AnimatedCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <AnimatedCard className="p-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4">UI Components Location</h3>
                <p className="text-on-surface-variant mb-2">
                  <strong>Directory:</strong> <code className="bg-surface-container-high px-2 py-1 rounded">src/components/ui/</code>
                </p>
                <p className="text-on-surface-variant text-sm">
                  All reusable UI components are stored in the ui folder. Each component is self-contained and can be imported directly.
                </p>
                <p className="text-on-surface-variant text-sm mt-4">
                  Example: <code className="bg-surface-container-high px-2 py-1 rounded">import {'{ AnimatedButton }'} from '../components/ui/AnimatedButton'</code>
                </p>
              </AnimatedCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <AnimatedCard className="p-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4">Animation Framework</h3>
                <p className="text-on-surface-variant mb-2">
                  <strong>Library:</strong> <code className="bg-surface-container-high px-2 py-1 rounded">Framer Motion</code>
                </p>
                <p className="text-on-surface-variant text-sm">
                  All animations use Framer Motion for smooth, physics-based transitions. Spring animations use stiffness: 500, damping: 30 for tactile feel.
                </p>
              </AnimatedCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <AnimatedCard className="p-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4">Design System Theme</h3>
                <p className="text-on-surface-variant mb-2">
                  <strong>Style:</strong> <code className="bg-surface-container-high px-2 py-1 rounded">Metric Slate (Dark Mode)</code>
                </p>
                <p className="text-on-surface-variant text-sm">
                  Primary color: <code className="bg-surface-container-high px-2 py-1 rounded">#2e5bff</code> (Electric Blue)
                </p>
                <p className="text-on-surface-variant text-sm">
                  Tertiary color: <code className="bg-surface-container-high px-2 py-1 rounded">#10b981</code> (Emerald Green)
                </p>
                <p className="text-on-surface-variant text-sm">
                  Background: <code className="bg-surface-container-high px-2 py-1 rounded">#111111</code> (Neutral Charcoal)
                </p>
              </AnimatedCard>
            </motion.div>
          </motion.div>
        </section>

        {/* Quick Tips */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-on-surface mb-8 pb-4 border-b border-outline-variant/30">
            Quick Tips
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <AnimatedCard className="p-6">
              <h3 className="font-semibold text-on-surface mb-3">Do:</h3>
              <ul className="text-sm text-on-surface-variant space-y-2">
                <li>• Use predefined color variables from Tailwind</li>
                <li>• Combine reusable components together</li>
                <li>• Use opacity modifiers (e.g., /20) for subtle effects</li>
                <li>• Follow Material Design 3 token naming</li>
              </ul>
            </AnimatedCard>
            <AnimatedCard className="p-6">
              <h3 className="font-semibold text-on-surface mb-3">Don't:</h3>
              <ul className="text-sm text-on-surface-variant space-y-2">
                <li>• Use hard-coded hex colors in components</li>
                <li>• Create new color variables without discussion</li>
                <li>• Use 100% opaque borders (use /15 or /20 opacity)</li>
                <li>• Add new UI components without style guide entry</li>
              </ul>
            </AnimatedCard>
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}
