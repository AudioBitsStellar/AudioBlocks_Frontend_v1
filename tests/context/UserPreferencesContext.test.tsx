import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  UserPreferencesProvider,
  useUserPreferences,
} from '@/context/UserPreferencesContext';

vi.mock('@/lib/apiClient', () => ({
  default: { put: vi.fn().mockResolvedValue({}), get: vi.fn().mockResolvedValue({}) },
}));

describe('UserPreferencesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
