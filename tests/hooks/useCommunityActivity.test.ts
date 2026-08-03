import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useCommunityActivity,
  CommunityActivity,
  CommunityEvent,
} from '@/hooks/useCommunityActivity';
import apiClient from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

const NOW = 1_700_000_000_000;

const baseActivity = (
  communityId: string,
  overrides: Partial<CommunityActivity> = {}
): CommunityActivity => ({
  communityId,
  memberCount: 10,
  onlineCount: 3,
  recentEvents: [
    { id: `${communityId}-e1`, type: 'join', description: 'Alice joined', timestamp: NOW - 1000 },
    { id: `${communityId}-e2`, type: 'post', description: 'Bob posted', timestamp: NOW - 2000 },
  ],
  lastUpdated: NOW,
  ...overrides,
});

describe('useCommunityActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { writable: true, value: false });
    vi.setSystemTime(NOW);
    mockApiClient.get.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockGetResponses(responses: Array<{ data: CommunityActivity; status?: number; headers?: Headers } | Error>) {
    let callIndex = 0;
    mockApiClient.get.mockImplementation(() => {
      const response = responses[callIndex] ?? responses[responses.length - 1];
      callIndex += 1;
      if (response instanceof Error) throw response;
      return Promise.resolve({
        data: response.data,
        status: response.status ?? 200,
        headers: response.headers ?? new Headers(),
      } as { data: CommunityActivity; status: number; headers: Headers });
    });
    return () => {
      callIndex = 0;
    };
  }

  it('returns null when communityId is null', () => {
    const { result } = renderHook(() => useCommunityActivity(null));
    expect(result.current).toBeNull();
  });

  it('returns null when communityId is undefined', () => {
    const { result } = renderHook(() => useCommunityActivity(undefined));
    expect(result.current).toBeNull();
  });

  it('fetches and returns activity on mount', async () => {
    const reset = mockGetResponses([{ data: baseActivity('c1'), status: 200, headers: new Headers() }]);

    const { result } = renderHook(() => useCommunityActivity('c1'));

    expect(result.current).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.communityId).toBe('c1');
    expect(result.current?.memberCount).toBe(10);
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/community/c1/activity');
    reset();
  });

  it('uses cached data on re-render without refetching', async () => {
    const reset = mockGetResponses([{ data: baseActivity('c2'), status: 200, headers: new Headers() }]);

    const { result, rerender } = renderHook(() => useCommunityActivity('c2'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.memberCount).toBe(10);

    rerender();

    expect(result.current?.memberCount).toBe(10);
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    reset();
  });

  it('polls and updates member count after interval', async () => {
    const reset = mockGetResponses([
      { data: baseActivity('c3', { memberCount: 10 }), status: 200, headers: new Headers() },
      { data: baseActivity('c3', { memberCount: 12 }), status: 200, headers: new Headers() },
    ]);

    const { result } = renderHook(() => useCommunityActivity('c3'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.memberCount).toBe(10);

    vi.setSystemTime(NOW + 360_000);

    await act(async () => {
      vi.advanceTimersByTimeAsync(360_000);
    });

    expect(result.current?.memberCount).toBe(12);
    expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    reset();
  });

  it('increments member count when API reflects a join', async () => {
    const reset = mockGetResponses([
      { data: baseActivity('c4', { memberCount: 10 }), status: 200, headers: new Headers() },
      { data: baseActivity('c4', { memberCount: 11 }), status: 200, headers: new Headers() },
    ]);

    const { result } = renderHook(() => useCommunityActivity('c4'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.memberCount).toBe(10);

    vi.setSystemTime(NOW + 360_000);

    await act(async () => {
      vi.advanceTimersByTimeAsync(360_000);
    });

    expect(result.current?.memberCount).toBe(11);
    reset();
  });

  it('decrements member count when API reflects a leave', async () => {
    const reset = mockGetResponses([
      { data: baseActivity('c5', { memberCount: 10 }), status: 200, headers: new Headers() },
      { data: baseActivity('c5', { memberCount: 9 }), status: 200, headers: new Headers() },
    ]);

    const { result } = renderHook(() => useCommunityActivity('c5'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.memberCount).toBe(10);

    vi.setSystemTime(NOW + 360_000);

    await act(async () => {
      vi.advanceTimersByTimeAsync(360_000);
    });

    expect(result.current?.memberCount).toBe(9);
    reset();
  });

  it('returns recentEvents from API response', async () => {
    const events: CommunityEvent[] = [
      { id: 'c6-e1', type: 'join', description: 'User joined', timestamp: NOW - 1000 },
      { id: 'c6-e2', type: 'post', description: 'User posted', timestamp: NOW - 2000 },
    ];
    const reset = mockGetResponses([{ data: baseActivity('c6', { recentEvents: events }), status: 200, headers: new Headers() }]);

    const { result } = renderHook(() => useCommunityActivity('c6'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.recentEvents).toEqual(events);
    reset();
  });

  it('returns zeroed activity on first fetch failure with no cache', async () => {
    const reset = mockGetResponses([new Error('Network error')]);

    const { result } = renderHook(() => useCommunityActivity('c7'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.memberCount).toBe(0);
    expect(result.current?.recentEvents).toEqual([]);
    reset();
  });

  it('returns cached data on fetch failure after successful initial fetch', async () => {
    const reset = mockGetResponses([
      { data: baseActivity('c8', { memberCount: 10 }), status: 200, headers: new Headers() },
      new Error('Network error'),
    ]);

    const { result } = renderHook(() => useCommunityActivity('c8'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.memberCount).toBe(10);

    vi.setSystemTime(NOW + 360_000);

    await act(async () => {
      vi.advanceTimersByTimeAsync(360_000);
    });

    expect(result.current?.memberCount).toBe(10);
    reset();
  });

  it('pauses polling when tab is hidden and resumes when visible', async () => {
    const reset = mockGetResponses([
      { data: baseActivity('c9', { memberCount: 10 }), status: 200, headers: new Headers() },
      { data: baseActivity('c9', { memberCount: 11 }), status: 200, headers: new Headers() },
    ]);

    const { result } = renderHook(() => useCommunityActivity('c9'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.memberCount).toBe(10);
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { writable: true, value: true });

    vi.setSystemTime(NOW + 360_000);

    await act(async () => {
      vi.advanceTimersByTimeAsync(360_000);
    });

    expect(mockApiClient.get).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { writable: true, value: false });

    await act(async () => {
      vi.advanceTimersByTimeAsync(0);
    });

    expect(mockApiClient.get).toHaveBeenCalledTimes(3);
    expect(result.current?.memberCount).toBe(11);
    reset();
  });

  it('cleans up interval and listener on unmount', async () => {
    const reset = mockGetResponses([{ data: baseActivity('c10'), status: 200, headers: new Headers() }]);

    const { result, unmount } = renderHook(() => useCommunityActivity('c10'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current?.memberCount).toBe(10);

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    unmount();

    vi.setSystemTime(NOW + 360_000);

    await act(async () => {
      vi.advanceTimersByTimeAsync(360_000);
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
    reset();
  });
});
