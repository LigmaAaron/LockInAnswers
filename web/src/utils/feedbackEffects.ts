import confetti from 'canvas-confetti'
import { Howl, Howler } from 'howler'
import { isSoundMuted } from './audioPreferences'

const BASE_VOLUME = 0.38

let correctSound: Howl | null = null
let wrongSound: Howl | null = null
let completeSound: Howl | null = null
let audioPrimed = false
let lastSoundAt = 0

const inBrowser = () => typeof window !== 'undefined'

const ensureSounds = () => {
  if (!inBrowser()) {
    return
  }

  if (!correctSound) {
    correctSound = new Howl({
      src: ['/sounds/correct.mp3'],
      volume: BASE_VOLUME,
      preload: true,
    })
  }

  if (!wrongSound) {
    wrongSound = new Howl({
      src: ['/sounds/wrong.mp3'],
      volume: BASE_VOLUME,
      preload: true,
    })
  }

  if (!completeSound) {
    completeSound = new Howl({
      src: ['/sounds/complete.mp3'],
      volume: 0.44,
      preload: true,
    })
  }
}

export const preloadFeedbackAudio = () => {
  ensureSounds()
  correctSound?.load()
  wrongSound?.load()
  completeSound?.load()
}

export const primeFeedbackAudioFromGesture = () => {
  if (!inBrowser() || audioPrimed) {
    return
  }

  ensureSounds()

  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    void Howler.ctx.resume()
  }

  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (AudioContextClass) {
    const ctx = new AudioContextClass()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0.00001
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.01)
    window.setTimeout(() => {
      ctx.close().catch(() => undefined)
    }, 80)
  }

  audioPrimed = true
}

const playFallbackTone = (frequency: number, durationMs: number) => {
  if (!inBrowser()) {
    return
  }

  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) {
    return
  }

  const audioContext = new AudioContextClass()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.value = BASE_VOLUME * 0.45

  oscillator.connect(gain)
  gain.connect(audioContext.destination)

  oscillator.start()
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + durationMs / 1000)
  oscillator.stop(audioContext.currentTime + durationMs / 1000)

  window.setTimeout(() => {
    audioContext.close().catch(() => undefined)
  }, durationMs + 120)
}

type AnswerEffectInput = {
  isCorrect: boolean
  streak: number
}

const isMilestoneStreak = (streak: number) => streak === 5 || streak === 10
const canPlaySoundNow = () => {
  const now = Date.now()
  if (now - lastSoundAt < 130) {
    return false
  }

  lastSoundAt = now
  return true
}

const playCorrect = (streak: number) => {
  if (isSoundMuted() || !canPlaySoundNow()) {
    return
  }

  ensureSounds()
  if (!correctSound || correctSound.state() !== 'loaded') {
    playFallbackTone(880, isMilestoneStreak(streak) ? 160 : 120)
    return
  }

  correctSound.stop()
  const soundId = correctSound.play()
  if (isMilestoneStreak(streak)) {
    correctSound.rate(1.08, soundId)
    correctSound.volume(0.46, soundId)
  }
}

const playWrong = () => {
  if (isSoundMuted() || !canPlaySoundNow()) {
    return
  }

  ensureSounds()
  if (!wrongSound || wrongSound.state() !== 'loaded') {
    playFallbackTone(220, 160)
    return
  }

  wrongSound.stop()
  const soundId = wrongSound.play()
  wrongSound.rate(0.96, soundId)
}

const playCompletion = () => {
  if (isSoundMuted() || !canPlaySoundNow()) {
    return
  }

  ensureSounds()
  if (!completeSound || completeSound.state() !== 'loaded') {
    playFallbackTone(659, 120)
    window.setTimeout(() => {
      playFallbackTone(880, 190)
    }, 110)
    return
  }

  completeSound.stop()
  const soundId = completeSound.play()
  completeSound.rate(1.03, soundId)
}

const burst = (particleCount: number, spread: number) => {
  if (!inBrowser()) {
    return
  }

  confetti({
    particleCount,
    spread,
    startVelocity: 28,
    ticks: 80,
    gravity: 1.05,
    scalar: 0.9,
    origin: { y: 0.72 },
  })
}

export const triggerAnswerEffects = ({ isCorrect, streak }: AnswerEffectInput) => {
  if (!isCorrect) {
    playWrong()
    return
  }

  playCorrect(streak)

  const launch = (particleCount: number, spread: number) => {
    window.setTimeout(() => burst(particleCount, spread), 90)
  }

  if (isMilestoneStreak(streak)) {
    launch(40, 70)
    return
  }

  launch(20, 40)
}

export const triggerChallengeCompletedEffects = () => {
  playCompletion()
  burst(100, 100)
}
