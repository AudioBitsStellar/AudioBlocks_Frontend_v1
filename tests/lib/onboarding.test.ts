import { beforeEach, describe, expect, it } from 'vitest';
import { hasCompletedOnboarding, markOnboardingComplete, resetOnboarding } from '@/lib/onboarding';

describe('onboarding flag (#478)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('treats a missing flag as incomplete so first-time users are redirected', () => {
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it('reports incomplete after an explicit reset', () => {
    markOnboardingComplete();
    resetOnboarding();
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it('persists completion until reset', () => {
    expect(hasCompletedOnboarding()).toBe(false); // first-time state
    markOnboardingComplete();
    expect(hasCompletedOnboarding()).toBe(true);
    resetOnboarding();
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it('treats storage failures as completed instead of throwing', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    expect(hasCompletedOnboarding()).toBe(true);
    getItem.mockRestore();
  });
});
