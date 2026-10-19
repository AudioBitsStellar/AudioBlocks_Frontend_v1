import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_VERSION,
  getAnalyticsConsent,
  getAnalyticsConsentRecord,
  hasAnalyticsConsent,
  resetAnalyticsConsentMemory,
  setAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from '@/lib/analyticsConsent';

const STORAGE_KEY = 'audioblocks_analytics_consent';

function setGpc(value: boolean | undefined) {
  Object.defineProperty(window.navigator, 'globalPrivacyControl', {
    configurable: true,
    value,
  });
}

describe('analytics consent (#597)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAnalyticsConsentMemory();
    setGpc(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setGpc(undefined);
  });

  it('is unset for a first-time visitor', () => {
    expect(getAnalyticsConsent()).toBe('unset');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('stores an accept and reports it as consent', () => {
    setAnalyticsConsent('accepted');

    expect(getAnalyticsConsent()).toBe('accepted');
    expect(hasAnalyticsConsent()).toBe(true);
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored).toMatchObject({ version: ANALYTICS_CONSENT_VERSION, status: 'accepted' });
  });

  it('treats a reject as no consent', () => {
    setAnalyticsConsent('rejected');

    expect(getAnalyticsConsent()).toBe('rejected');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('ignores a choice saved under an older consent version', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: ANALYTICS_CONSENT_VERSION - 1,
        status: 'accepted',
        updatedAt: new Date().toISOString(),
      })
    );

    expect(getAnalyticsConsentRecord()).toBeNull();
    expect(getAnalyticsConsent()).toBe('unset');
  });

  it('ignores corrupt stored JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');

    expect(getAnalyticsConsent()).toBe('unset');
  });

  it('defaults to rejected when Global Privacy Control is sent', () => {
    setGpc(true);

    expect(getAnalyticsConsent()).toBe('rejected');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('lets an explicit stored choice override Global Privacy Control', () => {
    setGpc(true);
    setAnalyticsConsent('accepted');

    expect(getAnalyticsConsent()).toBe('accepted');
  });

  it('keeps the choice in memory when storage throws', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(() => setAnalyticsConsent('accepted')).not.toThrow();
    expect(hasAnalyticsConsent()).toBe(true);

    setItem.mockRestore();
  });

  it('notifies subscribers when the choice changes', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(onChange);

    setAnalyticsConsent('accepted');
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    setAnalyticsConsent('rejected');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('asks an already-loaded Segment snippet to reset when rejected', () => {
    const reset = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).analytics = { track: vi.fn(), reset };

    setAnalyticsConsent('rejected');

    expect(reset).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).analytics;
  });
});
