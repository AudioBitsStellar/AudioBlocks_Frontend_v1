import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getOnboardingStorageKey,
  hasCompletedOnboarding,
  markOnboardingComplete,
  resetOnboarding,
} from '@/lib/onboarding';

describe('onboarding flag (#478, #712)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('treats a missing flag as incomplete so first-time users are redirected', () => {
    expect(hasCompletedOnboarding()).toBe(false);
    expect(hasCompletedOnboarding('user-1')).toBe(false);
  });

  it('reports incomplete after an explicit reset', () => {
    markOnboardingComplete('user-1');
    resetOnboarding('user-1');
    expect(hasCompletedOnboarding('user-1')).toBe(false);
  });

  it('persists completion until reset', () => {
    expect(hasCompletedOnboarding('user-1')).toBe(false);
    markOnboardingComplete('user-1');
    expect(hasCompletedOnboarding('user-1')).toBe(true);
    resetOnboarding('user-1');
    expect(hasCompletedOnboarding('user-1')).toBe(false);
  });

  it('keys the flag by userId so two users sharing a browser do not share the flag (#712)', () => {
    markOnboardingComplete('user-alice');

    expect(hasCompletedOnboarding('user-alice')).toBe(true);
    expect(hasCompletedOnboarding('user-bob')).toBe(false);

    // Resetting alice does not affect bob
    resetOnboarding('user-alice');
    expect(hasCompletedOnboarding('user-alice')).toBe(false);
    expect(hasCompletedOnboarding('user-bob')).toBe(false);
  });

  it('builds safe storage keys for arbitrary user IDs', () => {
    expect(getOnboardingStorageKey('user@example.com')).toBe(
      'audioblocks_onboarding_complete:user%40example.com'
    );
    expect(getOnboardingStorageKey(null)).toBe('audioblocks_onboarding_complete');
    expect(getOnboardingStorageKey()).toBe('audioblocks_onboarding_complete');
  });

  it('treats storage failures as completed instead of throwing', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(hasCompletedOnboarding('user-1')).toBe(true);
    expect(hasCompletedOnboarding()).toBe(true);
    getItem.mockRestore();
  });
});
