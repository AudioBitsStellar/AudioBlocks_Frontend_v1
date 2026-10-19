import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionExpiry } from '@/hooks/useSessionExpiry';
import { clearSession, refreshAccessToken } from '@/lib/apiClient';
import { SESSION } from '@/lib/constants';

let tokenCookie: string | undefined;

vi.mock('js-cookie', () => ({ default: { get: () => tokenCookie } }));
vi.mock('@/lib/apiClient', () => ({
  clearSession: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

const mockRefresh = vi.mocked(refreshAccessToken);
const mockClear = vi.mocked(clearSession);

const NOW = new Date('2026-01-01T00:00:00Z').getTime();

/** Builds an unsigned JWT-shaped token whose `exp` is `ms` from NOW. */
const tokenExpiringIn = (ms: number) =>
  `h.${btoa(JSON.stringify({ exp: Math.floor((NOW + ms) / 1000) }))}.s`;

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe('useSessionExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.clearAllMocks();
    tokenCookie = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports no countdown and no warning without a session token', async () => {
    const { result } = renderHook(() => useSessionExpiry({ onExpire: vi.fn() }));
    await advance(SESSION.CHECK_INTERVAL_MS);

    expect(result.current.msRemaining).toBeNull();
    expect(result.current.isWarningVisible).toBe(false);
  });

  it('treats a token without a readable exp claim as having no expiry', async () => {
    tokenCookie = `h.${btoa(JSON.stringify({ sub: 'user-1' }))}.s`;
    const onExpire = vi.fn();
    const { result } = renderHook(() => useSessionExpiry({ onExpire }));

    await advance(SESSION.WARNING_THRESHOLD_MS * 2);

    expect(result.current.msRemaining).toBeNull();
    expect(result.current.isWarningVisible).toBe(false);
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('shows the warning only once the token enters the warning window', async () => {
    tokenCookie = tokenExpiringIn(SESSION.WARNING_THRESHOLD_MS + 60_000);
    const { result } = renderHook(() => useSessionExpiry({ onExpire: vi.fn() }));
    await advance(SESSION.CHECK_INTERVAL_MS);

    expect(result.current.isWarningVisible).toBe(false);

    await advance(60_000);

    expect(result.current.isWarningVisible).toBe(true);
    expect(result.current.msRemaining).toBeLessThanOrEqual(SESSION.WARNING_THRESHOLD_MS);
  });

  it('respects a custom warning threshold', async () => {
    tokenCookie = tokenExpiringIn(30_000);
    const { result } = renderHook(() =>
      useSessionExpiry({ onExpire: vi.fn(), warningThresholdMs: 10_000 })
    );
    await advance(SESSION.CHECK_INTERVAL_MS);

    expect(result.current.isWarningVisible).toBe(false);
  });

  it('signs out when a warned session lapses', async () => {
    tokenCookie = tokenExpiringIn(SESSION.WARNING_THRESHOLD_MS + 1_000);
    const onExpire = vi.fn();
    renderHook(() => useSessionExpiry({ onExpire }));

    await advance(1_000);
    expect(onExpire).not.toHaveBeenCalled();

    await advance(SESSION.WARNING_THRESHOLD_MS);

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('attempts a silent refresh instead of signing out when the user was never warned', async () => {
    tokenCookie = tokenExpiringIn(-1_000);
    mockRefresh.mockImplementation(async () => {
      tokenCookie = tokenExpiringIn(15 * 60_000);
      return tokenCookie;
    });
    const onExpire = vi.fn();
    const { result } = renderHook(() => useSessionExpiry({ onExpire }));

    await advance(0);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
    expect(result.current.isWarningVisible).toBe(false);
  });

  it('signs out when the silent refresh fails', async () => {
    tokenCookie = tokenExpiringIn(-1_000);
    mockRefresh.mockRejectedValue(new Error('refresh failed'));
    const onExpire = vi.fn();
    renderHook(() => useSessionExpiry({ onExpire }));

    await advance(0);

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('does not expire the same token twice', async () => {
    tokenCookie = tokenExpiringIn(-1_000);
    mockRefresh.mockRejectedValue(new Error('refresh failed'));
    const onExpire = vi.fn();
    renderHook(() => useSessionExpiry({ onExpire }));

    await advance(SESSION.CHECK_INTERVAL_MS * 3);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('hides the warning when dismissed but still signs out if the session lapses', async () => {
    tokenCookie = tokenExpiringIn(30_000);
    const onExpire = vi.fn();
    const { result } = renderHook(() => useSessionExpiry({ onExpire }));
    await advance(SESSION.CHECK_INTERVAL_MS);
    expect(result.current.isWarningVisible).toBe(true);

    act(() => result.current.dismiss());
    expect(result.current.isWarningVisible).toBe(false);

    await advance(31_000);

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('resets the countdown when a refreshed token is read from the cookie', async () => {
    tokenCookie = tokenExpiringIn(60_000);
    const onExpire = vi.fn();
    const { result } = renderHook(() => useSessionExpiry({ onExpire }));
    await advance(SESSION.CHECK_INTERVAL_MS);
    expect(result.current.isWarningVisible).toBe(true);

    tokenCookie = tokenExpiringIn(15 * 60_000);
    await advance(SESSION.CHECK_INTERVAL_MS);

    expect(result.current.isWarningVisible).toBe(false);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('re-reads the cookie when the tab becomes visible', async () => {
    tokenCookie = tokenExpiringIn(60_000);
    const { result } = renderHook(() => useSessionExpiry({ onExpire: vi.fn() }));
    await advance(SESSION.CHECK_INTERVAL_MS);
    expect(result.current.isWarningVisible).toBe(true);

    tokenCookie = tokenExpiringIn(15 * 60_000);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isWarningVisible).toBe(false);
  });

  describe('extendSession', () => {
    it('refreshes the token and returns true on success', async () => {
      tokenCookie = tokenExpiringIn(60_000);
      mockRefresh.mockResolvedValue('fresh-token');
      const { result } = renderHook(() => useSessionExpiry({ onExpire: vi.fn() }));

      let extended = false;
      await act(async () => {
        extended = await result.current.extendSession();
      });

      expect(extended).toBe(true);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(result.current.isExtending).toBe(false);
    });

    it('returns false and clears isExtending when the refresh fails', async () => {
      tokenCookie = tokenExpiringIn(60_000);
      mockRefresh.mockRejectedValue(new Error('nope'));
      const { result } = renderHook(() => useSessionExpiry({ onExpire: vi.fn() }));

      let extended = true;
      await act(async () => {
        extended = await result.current.extendSession();
      });

      expect(extended).toBe(false);
      expect(result.current.isExtending).toBe(false);
    });
  });

  it('clears its interval and listener on unmount', async () => {
    const { unmount } = renderHook(() => useSessionExpiry({ onExpire: vi.fn() }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
