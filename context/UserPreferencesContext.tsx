'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import apiClient from '@/lib/apiClient';
import { normalizeAudioQuality, type AudioQuality } from '@/lib/streamQuality';
import {
  DEFAULT_NORMALIZATION_TARGET_LUFS,
  normalizeTargetLufs,
  type NormalizationTargetLufs,
} from '@/lib/player/normalizationGain';

// ── Types ─────────────────────────────────────────────────────────────────────

export type { AudioQuality, NormalizationTargetLufs };
export type ColorScheme = 'system' | 'light' | 'dark';

export interface UserPreferences {
  colorScheme: ColorScheme;
  language: string;
  autoplay: boolean;
  showExplicitContent: boolean;
  audioQuality: AudioQuality;
  /** When true, the artist's uploads skip the automated AI quality checks. */
  qualityAnalysisOptOut: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  /** Loudness that normalized playback aims for, in LUFS (#582). */
  normalizationTargetLufs: NormalizationTargetLufs;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  colorScheme: 'system',
  language: 'en',
  autoplay: true,
  showExplicitContent: false,
  audioQuality: 'auto',
  qualityAnalysisOptOut: false,
  emailNotifications: true,
  inAppNotifications: true,
  normalizationTargetLufs: DEFAULT_NORMALIZATION_TARGET_LUFS,
};

export interface UserPreferencesContextValue {
  preferences: UserPreferences;
  isSyncing: boolean;
  syncError: string | null;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  resetPreferences: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

const PREFS_STORAGE_KEY = 'audioblocks_user_preferences';
const SYNC_ENDPOINT = '/api/user/preferences';
const SYNC_DEBOUNCE_MS = 1500;

// ── Provider ──────────────────────────────────────────────────────────────────

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [storedPreferences, setPreferences] = useLocalStorage<UserPreferences>(
    PREFS_STORAGE_KEY,
    DEFAULT_PREFERENCES
  );
  // Values saved before #590 (`low`, `medium`) are mapped to the current quality names.
  const preferences = useMemo<UserPreferences>(
    () => ({
      ...storedPreferences,
      audioQuality: normalizeAudioQuality(storedPreferences.audioQuality),
      normalizationTargetLufs: normalizeTargetLufs(storedPreferences.normalizationTargetLufs),
    }),
    [storedPreferences]
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Skip syncing on the initial mount (hydration from localStorage).
  const mounted = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (syncTimerRef.current !== null) clearTimeout(syncTimerRef.current);
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    syncTimerRef.current = setTimeout(async () => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        await apiClient.put(SYNC_ENDPOINT, preferences, { signal: controller.signal });
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        setSyncError(err instanceof Error ? err.message : 'Failed to sync preferences.');
      } finally {
        setIsSyncing(false);
      }
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimerRef.current !== null) clearTimeout(syncTimerRef.current);
    };
  }, [preferences]);

  const setPreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences({ ...preferences, [key]: value });
    },
    [preferences, setPreferences]
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, [setPreferences]);

  const value = useMemo<UserPreferencesContextValue>(
    () => ({ preferences, isSyncing, syncError, setPreference, resetPreferences }),
    [preferences, isSyncing, syncError, setPreference, resetPreferences]
  );

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences must be used inside UserPreferencesProvider');
  return ctx;
}

/** Like `useUserPreferences`, but returns null outside the provider instead of throwing. */
export function useOptionalUserPreferences(): UserPreferencesContextValue | null {
  return useContext(UserPreferencesContext);
}
