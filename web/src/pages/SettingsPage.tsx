import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Appear } from '../components/ui/Appear'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { Toggle } from '../components/ui/Toggle'
import { getAudioPreferences, setSoundMuted } from '../utils/audioPreferences'

export function SettingsPage() {
  const { session, currentUser, updateCurrentUser } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')

  const [username, setUsername] = useState(currentUser?.username ?? '')
  const [soundMuted, setSoundMutedState] = useState(currentUser?.mute_sound_effects ?? getAudioPreferences().muted)
  const [privacy, setPrivacy] = useState(currentUser?.privacy ?? 'friends')

  useEffect(() => {
    if (!currentUser) {
      return
    }

    setUsername(currentUser.username)
    setSoundMutedState(currentUser.mute_sound_effects)
    setPrivacy(currentUser.privacy)
  }, [currentUser])

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')

    if (!username.trim()) {
      setMessage('Username is required.')
      return
    }

    const result = await updateCurrentUser({
      username: username.trim(),
      privacy: privacy as 'public' | 'friends' | 'private',
      mute_sound_effects: soundMuted,
    })

    if (!result.ok) {
      setMessage(result.message ?? 'Unable to save settings right now.')
      return
    }

    setSoundMuted(soundMuted)
    setMessage('Settings saved successfully!')

    setTimeout(() => {
      setMessage('')
    }, 2000)
  }

  return (
    <Appear className="w-full max-w-3xl mx-auto">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-on-surface">Settings</h1>
        <p className="text-on-surface-variant mt-2">Manage your account, privacy, and gameplay preferences.</p>
      </div>

      <form onSubmit={onSave} className="space-y-8">
        {/* Profile Section */}
        <section className="border-b border-outline-variant/15 pb-8">
          <h2 className="text-lg font-bold text-on-surface mb-6">Profile</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-on-surface mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your public username"
                className="w-full bg-surface-container-low border border-outline-variant/15 rounded-lg py-3 px-4 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="text-xs text-on-surface-variant mt-2">This is your main identity in Lock In Answers.</p>
            </div>

            <div>
              <p className="text-xs text-on-surface-variant mt-2">Your username is your public identity in Lock In Answers.</p>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="border-b border-outline-variant/15 pb-8">
          <h2 className="text-lg font-bold text-on-surface mb-6">Privacy</h2>
          
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setPrivacy('public')}
              className={`w-full rounded-lg p-4 text-left transition-colors ${
                privacy === 'public'
                  ? 'bg-surface-container-high'
                  : 'bg-surface-container-low hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
                  public
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">Public</p>
                  <p className="text-xs text-on-surface-variant mt-1">Everyone can see your activity and scores.</p>
                </div>
                <span
                  className={`material-symbols-outlined transition-colors ${
                    privacy === 'public' ? 'text-primary' : 'text-outline'
                  }`}
                  style={{ fontVariationSettings: privacy === 'public' ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {privacy === 'public' ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPrivacy('friends')}
              className={`w-full rounded-lg p-4 text-left transition-colors ${
                privacy === 'friends'
                  ? 'bg-surface-container-high'
                  : 'bg-surface-container-low hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
                  people
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">Friends Only</p>
                  <p className="text-xs text-on-surface-variant mt-1">Only your friends can see your activity.</p>
                </div>
                <span
                  className={`material-symbols-outlined transition-colors ${
                    privacy === 'friends' ? 'text-primary' : 'text-outline'
                  }`}
                  style={{ fontVariationSettings: privacy === 'friends' ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {privacy === 'friends' ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPrivacy('private')}
              className={`w-full rounded-lg p-4 text-left transition-colors ${
                privacy === 'private'
                  ? 'bg-surface-container-high'
                  : 'bg-surface-container-low hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
                  lock
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-on-surface">Private</p>
                  <p className="text-xs text-on-surface-variant mt-1">Your stats and activity are kept private.</p>
                </div>
                <span
                  className={`material-symbols-outlined transition-colors ${
                    privacy === 'private' ? 'text-primary' : 'text-outline'
                  }`}
                  style={{ fontVariationSettings: privacy === 'private' ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {privacy === 'private' ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* Gameplay Section */}
        <section className="border-b border-outline-variant/15 pb-8">
          <h2 className="text-lg font-bold text-on-surface mb-6">Gameplay</h2>
          
          <Toggle
            label="Mute Sound Effects"
            description="Turn off answer feedback and completion sounds across the app."
            checked={soundMuted}
            onChange={(checked) => {
              setSoundMutedState(checked)
            }}
          />
        </section>

        {/* Account Section */}
        <section className="pb-8">
          <h2 className="text-lg font-bold text-on-surface mb-6">Account</h2>
          
          <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/15">
            <p className="text-sm text-on-surface mb-3">
              Email: <span className="font-semibold">{session?.user.email}</span>
            </p>
            <p className="text-xs text-on-surface-variant">
              Your account is secure. If you need to change your password or email, contact support.
            </p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-8 border-t border-outline-variant/15">
          {message && (
            <p className={`text-sm ${message.includes('saved') ? 'text-tertiary' : 'text-error'}`}>
              {message}
            </p>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Back to Profile
          </button>
          <AnimatedButton type="submit">Save Changes</AnimatedButton>
        </div>
      </form>
    </Appear>
  )
}
