import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  UserPreferencesProvider,
  useUserPreferences,
} from '@/context/UserPreferencesContext';
import apiClient from '@/lib/apiClient';
import { hasAuthSession } from '@/lib/session';

vi.mock('@/lib/apiClient', () => ({
  default: { put: vi.fn().mockResolvedValue({}), get: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/lib/session', () => ({
  hasAuthSession: vi.fn().mockReturnValue(false),
}));

const mockGet = vi.mocked(apiClient.get);
const mockHasSession = vi.mocked(hasAuthSession);

describe('UserPreferencesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasSession.mockReturnValue(false);
    mockGet.mockResolvedValue({ data: {} });
    localStorage.clear();
  });

  it('defaults to running quality checks on uploads', () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper: UserPreferencesProvider });
    expect(result.current.preferences.qualityAnalysisOptOut).toBe(false);
  });

  it('lets an artist opt out of quality checks and persists the choice', () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper: UserPreferencesProvider });

    act(() => {
      result.current.setPreference('qualityAnalysisOptOut', true);
    });

    expect(result.current.preferences.qualityAnalysisOptOut).toBe(true);
    expect(
      JSON.parse(localStorage.getItem('audioblocks_user_preferences') ?? '{}')
    ).toMatchObject({ qualityAnalysisOptOut: true });
  });

  it('hydrates a stored opt-out preference', () => {
    localStorage.setItem(
      'audioblocks_user_preferences',
      JSON.stringify({ ...DEFAULT_PREFERENCES, qualityAnalysisOptOut: true })
    );

    const { result } = renderHook(() => useUserPreferences(), { wrapper: UserPreferencesProvider });
    expect(result.current.preferences.qualityAnalysisOptOut).toBe(true);
  });

  it('throws when used outside of the provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useUserPreferences())).toThrow(
      'useUserPreferences must be used inside UserPreferencesProvider'
    );
    consoleSpy.mockRestore();
  });

  describe('server hydration (#856)', () => {
    it('does not call the server when the listener is signed out', async () => {
      renderHook(() => useUserPreferences(), { wrapper: UserPreferencesProvider });
      await waitFor(() => expect(mockGet).not.toHaveBeenCalled());
    });

    it('merges a signed-in listener\'s saved preferences from the server', async () => {
      mockHasSession.mockReturnValue(true);
      mockGet.mockResolvedValue({ data: { emailNotifications: false, autoplay: false } });

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: UserPreferencesProvider,
      });

      await waitFor(() => expect(result.current.preferences.emailNotifications).toBe(false));
      expect(result.current.preferences.autoplay).toBe(false);
      // Keys the server response didn't include keep their local/default value.
      expect(result.current.preferences.qualityAnalysisOptOut).toBe(false);
    });

    it('keeps the local copy when the server has no saved preferences yet', async () => {
      mockHasSession.mockReturnValue(true);
      mockGet.mockRejectedValue(new Error('not found'));

      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: UserPreferencesProvider,
      });

      await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/user/preferences'));
      expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
    });
  });
});
