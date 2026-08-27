'use client';

import { useUserPreferences } from '@/context/UserPreferencesContext';
import type { AudioQuality } from '@/context/UserPreferencesContext';

const QUALITY_OPTIONS: { value: AudioQuality; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: 'Adapt quality based on your connection speed' },
  { value: 'low', label: 'Low', description: 'Uses less data, lower audio fidelity' },
  { value: 'medium', label: 'Medium', description: 'Balanced quality and data usage' },
  { value: 'high', label: 'High', description: 'Best audio quality, uses more data' },
];

export default function SettingsPage() {
  const { preferences, setPreference } = useUserPreferences();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Audio Quality</h2>
        <p className="text-sm text-gray-400 mb-4">
          Choose the default audio streaming quality for your playback experience.
        </p>
        <div className="grid gap-3">
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                preferences.audioQuality === option.value
                  ? 'border-[#D2045B] bg-[#D2045B]/10 text-white'
                  : 'border-gray-700 bg-[#1E1E1E] text-gray-300 hover:border-gray-500'
              }`}
              onClick={() => setPreference('audioQuality', option.value)}
            >
              <div className="text-left">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-400 mt-1">{option.description}</div>
              </div>
              {preferences.audioQuality === option.value && (
                <div className="h-3 w-3 rounded-full bg-[#D2045B]" />
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Playback</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]">
            <div>
              <div className="font-medium text-white">Autoplay</div>
              <div className="text-xs text-gray-400 mt-1">
                Automatically play the next track when the current one ends
              </div>
            </div>
            <button
              aria-label={`Autoplay is ${preferences.autoplay ? 'on' : 'off'}`}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.autoplay ? 'bg-[#D2045B]' : 'bg-gray-600'
              }`}
              onClick={() => setPreference('autoplay', !preferences.autoplay)}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.autoplay ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]">
            <div>
              <div className="font-medium text-white">Show Explicit Content</div>
              <div className="text-xs text-gray-400 mt-1">
                Include tracks marked as explicit in recommendations
              </div>
            </div>
            <button
              aria-label={`Explicit content is ${preferences.showExplicitContent ? 'on' : 'off'}`}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.showExplicitContent ? 'bg-[#D2045B]' : 'bg-gray-600'
              }`}
              onClick={() =>
                setPreference('showExplicitContent', !preferences.showExplicitContent)
              }
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.showExplicitContent ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]">
            <div>
              <div className="font-medium text-white">Email Notifications</div>
              <div className="text-xs text-gray-400 mt-1">
                Receive updates and recommendations via email
              </div>
            </div>
            <button
              aria-label={`Email notifications are ${preferences.emailNotifications ? 'on' : 'off'}`}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.emailNotifications ? 'bg-[#D2045B]' : 'bg-gray-600'
              }`}
              onClick={() =>
                setPreference('emailNotifications', !preferences.emailNotifications)
              }
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]">
            <div>
              <div className="font-medium text-white">In-App Notifications</div>
              <div className="text-xs text-gray-400 mt-1">
                Show notifications within the app
              </div>
            </div>
            <button
              aria-label={`In-app notifications are ${preferences.inAppNotifications ? 'on' : 'off'}`}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.inAppNotifications ? 'bg-[#D2045B]' : 'bg-gray-600'
              }`}
              onClick={() =>
                setPreference('inAppNotifications', !preferences.inAppNotifications)
              }
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.inAppNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
