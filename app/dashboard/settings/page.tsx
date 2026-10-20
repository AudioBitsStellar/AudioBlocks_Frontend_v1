'use client';
import Link from 'next/link';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Mail, Wallet, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRecentlyPlayed } from '@/hooks/useRecentlyPlayed';
import { usePlayback } from '@/context/PlaybackContext';
import {
  useUserPreferences,
  type AudioQuality,
  type NormalizationTargetLufs,
} from '@/context/UserPreferencesContext';
import AccountLinkingUI from '@/components/auth/AccountLinkingUI';
import DataSaverToggle from '@/components/help/DataSaverToggle';
import PrivacyDataSection from '@/components/settings/PrivacyDataSection';
import SubscriptionSection from '@/components/settings/SubscriptionSection';

function LinkedAccountsList() {
  const { user, handleUnlinkWallet } = useDynamicContext();
  const linkedWallets = user?.verifiedCredentials?.filter((cred) => cred.format === 'wallet') || [];
  const linkedEmails = user?.verifiedCredentials?.filter((cred) => cred.format === 'email') || [];

  return (
    <>
      {linkedWallets.map((wallet) => (
        <div
          key={wallet.id}
          className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]"
        >
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-gray-400" />
            <div>
              <div className="font-medium text-white">{wallet.walletName || 'Wallet'}</div>
              <div className="text-xs text-gray-400 mt-1">
                {wallet.address && `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
              </div>
            </div>
          </div>
          <button
            className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 transition-colors"
            title="Unlink Wallet"
            onClick={() => handleUnlinkWallet(wallet.id)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {linkedEmails.map((emailCred) => (
        <div
          key={emailCred.id}
          className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]"
        >
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <div className="font-medium text-white">Email</div>
              <div className="text-xs text-gray-400 mt-1">{emailCred.email}</div>
            </div>
          </div>
          {/* Note: Unlinking email might be different or not supported depending on Dynamic configuration, but we can provide the UI if it has an ID and handleUnlinkWallet handles it, or just show it */}
        </div>
      ))}
      {linkedWallets.length === 0 && linkedEmails.length === 0 && (
        <div className="text-sm text-gray-400">No linked accounts found.</div>
      )}
    </>
  );
}

function ListeningHistorySection() {
  const { clearHistory } = useRecentlyPlayed();
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    if (!window.confirm('Clear your listening history? This also applies to your other devices.')) {
      return;
    }
    setIsClearing(true);
    try {
      await clearHistory();
      toast.success('Listening history cleared');
    } catch {
      toast.error('Could not clear your listening history. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-4">Listening History</h2>
      <p className="text-sm text-gray-400 mb-4">
        Recently played tracks follow your account across browsers.
      </p>
      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]">
        <div>
          <div className="font-medium text-white">Clear listening history</div>
          <div className="text-xs text-gray-400 mt-1">
            Removes recently played tracks from your account and this browser.
          </div>
        </div>
        <button
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/60 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isClearing}
          type="button"
          onClick={handleClear}
        >
          {isClearing ? 'Clearing…' : 'Clear history'}
        </button>
      </div>
    </section>
  );
}

const QUALITY_OPTIONS: { value: AudioQuality; label: string; description: string }[] = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'Adapt quality to your connection. Uses data saver when Save-Data is on.',
  },
  {
    value: 'data-saver',
    label: 'Data saver',
    description: 'Streams at up to 64 kbps. Best for metered mobile data.',
  },
  { value: 'normal', label: 'Normal', description: 'Streams at up to 128 kbps.' },
  { value: 'high', label: 'High', description: 'Streams at up to 256 kbps. Uses the most data.' },
];

const NORMALIZATION_TARGET_OPTIONS: {
  value: NormalizationTargetLufs;
  label: string;
  description: string;
}[] = [
  { value: -23, label: 'Quiet', description: '−23 LUFS. Keeps more of the original dynamics.' },
  { value: -14, label: 'Normal', description: '−14 LUFS. Close to most streaming services.' },
  { value: -11, label: 'Loud', description: '−11 LUFS. Louder, with less dynamic range.' },
];

function VolumeNormalizationSection() {
  const { preferences, setPreference } = useUserPreferences();
  const { normalizeAudio, setNormalizeAudio } = usePlayback();

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-4">Volume Normalization</h2>
      <p className="text-sm text-gray-400 mb-4">
        Play tracks at a similar volume using each song&apos;s measured loudness. Tracks without a
        measurement play at their original volume.
      </p>
      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E] mb-4">
        <div>
          <div className="font-medium text-white">Normalize volume</div>
          <div className="text-xs text-gray-400 mt-1">Also available from the player bar.</div>
        </div>
        <button
          aria-label={`Normalize volume is ${normalizeAudio ? 'on' : 'off'}`}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            normalizeAudio ? 'bg-[#D2045B]' : 'bg-gray-600'
          }`}
          onClick={() => setNormalizeAudio(!normalizeAudio)}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              normalizeAudio ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <div className="grid gap-3" role="group" aria-label="Normalization target level">
        {NORMALIZATION_TARGET_OPTIONS.map((option) => {
          const selected = preferences.normalizationTargetLufs === option.value;
          return (
            <button
              key={option.value}
              aria-pressed={selected}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                selected
                  ? 'border-[#D2045B] bg-[#D2045B]/10 text-white'
                  : 'border-gray-700 bg-[#1E1E1E] text-gray-300 hover:border-gray-500'
              }`}
              type="button"
              onClick={() => setPreference('normalizationTargetLufs', option.value)}
            >
              <div className="text-left">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-400 mt-1">{option.description}</div>
              </div>
              {selected && <div className="h-3 w-3 rounded-full bg-[#D2045B]" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { preferences, setPreference } = useUserPreferences();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Linked Accounts</h2>
        <p className="text-sm text-gray-400 mb-4">
          Manage the wallets and identities connected to your account.
        </p>
        <div className="space-y-4">
          <AccountLinkingUI />
          <LinkedAccountsList />
        </div>
      </section>

      <SubscriptionSection />

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Audio Quality</h2>
        <p className="text-sm text-gray-400 mb-4">
          Choose the default audio streaming quality for your playback experience.
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Safari plays streams natively and cannot cap the bitrate, so these limits only apply in
          other browsers.
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

      <VolumeNormalizationSection />

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Playback</h2>
        <DataSaverToggle />
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
              onClick={() => setPreference('showExplicitContent', !preferences.showExplicitContent)}
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

      <ListeningHistorySection />

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Quality Checks</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]">
            <div>
              <div className="font-medium text-white">Opt Out of Quality Checks</div>
              <div className="text-xs text-gray-400 mt-1">
                Skip the automated AI quality analysis on your uploads. Existing tracks stay online
                and you can turn this back on at any time.
              </div>
            </div>
            <button
              aria-label={`Quality checks are ${preferences.qualityAnalysisOptOut ? 'off' : 'on'}`}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.qualityAnalysisOptOut ? 'bg-gray-600' : 'bg-[#D2045B]'
              }`}
              onClick={() =>
                setPreference('qualityAnalysisOptOut', !preferences.qualityAnalysisOptOut)
              }
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.qualityAnalysisOptOut ? 'translate-x-1' : 'translate-x-6'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#1E1E1E]">
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                Tune Platform Quality Thresholds
                <span className="rounded-full bg-[#D2045B]/15 px-2 py-0.5 text-[10px] font-semibold text-[#D2045B] border border-[#D2045B]/30">
                  Admin
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Configure minimum confidence scores per genre and review adaptive moderation
                feedback.
              </div>
            </div>
            <Link
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#D2045B] hover:bg-[#b0034c] rounded-lg transition-colors shrink-0"
              href="/dashboard/settings/quality"
            >
              Tune Thresholds
            </Link>
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
              onClick={() => setPreference('emailNotifications', !preferences.emailNotifications)}
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
              <div className="text-xs text-gray-400 mt-1">Show notifications within the app</div>
            </div>
            <button
              aria-label={`In-app notifications are ${preferences.inAppNotifications ? 'on' : 'off'}`}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.inAppNotifications ? 'bg-[#D2045B]' : 'bg-gray-600'
              }`}
              onClick={() => setPreference('inAppNotifications', !preferences.inAppNotifications)}
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

      <PrivacyDataSection />
    </div>
  );
}
