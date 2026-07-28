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

// ── Types ─────────────────────────────────────────────────────────────────────

export type ColorScheme = 'system' | 'light' | 'dark';
export type AudioQuality = 'auto' | 'low' | 'medium' | 'high';

export interface UserPreferences {
  colorScheme: ColorScheme;
  language: string;
  autoplay: boolean;
  showExplicitContent: boolean;
  audioQuality: AudioQuality;
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  colorScheme: 'system',
  language: 'en',
  autoplay: true,
  showExplicitContent: false,
  audioQuality: 'auto',
  emailNotifications: true,
  inAppNotifications: true,
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
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    PREFS_STORAGE_KEY,
    DEFAULT_PREFERENCES,
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
  }, [preferences]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences({ ...preferences, [key]: value });
    },
    [preferences, setPreferences],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, [setPreferences]);

  const value = useMemo<UserPreferencesContextValue>(
    () => ({ preferences, isSyncing, syncError, setPreference, resetPreferences }),
    [preferences, isSyncing, syncError, setPreference, resetPreferences],
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences must be used inside UserPreferencesProvider');
  return ctx;
}
