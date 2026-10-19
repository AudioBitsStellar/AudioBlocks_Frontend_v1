import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAnalyticsEnabled, trackEvent } from '@/lib/analytics';
import { resetAnalyticsConsentMemory, setAnalyticsConsent } from '@/lib/analyticsConsent';

describe('lib/analytics', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
    resetAnalyticsConsentMemory();
    setAnalyticsConsent('accepted');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).analytics;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).ga;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('isAnalyticsEnabled', () => {
    it('is enabled by default', () => {
      expect(isAnalyticsEnabled()).toBe(true);
    });

    it('is disabled when NEXT_PUBLIC_ANALYTICS_ENABLED is "false"', () => {
      vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'false');
      expect(isAnalyticsEnabled()).toBe(false);
    });
  });

  describe('trackEvent', () => {
    it('dispatches through Segment when the snippet is loaded', () => {
      const track = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).analytics = { track };

      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      trackEvent('wallet_connect', { address: '0xabc' });

      expect(track).toHaveBeenCalledWith('wallet_connect', { address: '0xabc' });
      debugSpy.mockRestore();
    });

    it('falls back to Google Analytics ga() when Segment is absent', () => {
      const ga = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).ga = ga;

      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      trackEvent('wallet_disconnect');

      expect(ga).toHaveBeenCalledWith(
        'send',
        'event',
        'wallet',
        'wallet_disconnect',
        expect.any(String)
      );
      debugSpy.mockRestore();
    });

    it('drops events until the visitor accepts analytics (#597)', () => {
      setAnalyticsConsent('rejected');
      const track = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).analytics = { track };

      trackEvent('wallet_connect');

      expect(track).not.toHaveBeenCalled();
    });

    it('is a no-op when analytics are disabled', () => {
      vi.stubEnv('NEXT_PUBLIC_ANALYTICS_ENABLED', 'false');
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).analytics = { track: vi.fn() };

      trackEvent('wallet_connect');

      expect(debugSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
    });
  });
});
