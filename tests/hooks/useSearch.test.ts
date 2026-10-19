import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSearch } from '@/hooks/useSearch';
import { searchContent } from '@/lib/exploreService';

vi.mock('@/lib/exploreService', () => ({
  searchContent: vi.fn(),
}));

const mockedSearch = vi.mocked(searchContent);

const RESULTS = [{ id: '1', title: 'Jazz Night' }] as unknown as Awaited<
  ReturnType<typeof searchContent>
>;

describe('useSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedSearch.mockReset();
    mockedSearch.mockResolvedValue(RESULTS);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns empty results and does not search for an empty query', () => {
    const { result } = renderHook(() => useSearch(''));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it('does not search for queries shorter than 3 characters', () => {
    renderHook(() => useSearch('ab'));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it('debounces the search using the default 200ms delay', () => {
    renderHook(() => useSearch('jazz'));

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(mockedSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockedSearch).toHaveBeenCalledWith('jazz');
  });

  it('trims the query before searching', () => {
    renderHook(() => useSearch('  jazz  '));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockedSearch).toHaveBeenCalledWith('jazz');
  });

  it('only searches for the last query when the input changes quickly', () => {
    const { rerender } = renderHook(({ q }) => useSearch(q), {
      initialProps: { q: 'jaz' },
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ q: 'jazz' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockedSearch).toHaveBeenCalledTimes(1);
    expect(mockedSearch).toHaveBeenCalledWith('jazz');
  });

  it('returns results and clears loading once the search resolves', async () => {
    const { result } = renderHook(() => useSearch('jazz'));

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.results).toEqual(RESULTS);
    expect(result.current.loading).toBe(false);
  });

  it('logs the error and clears loading when the search fails', async () => {
    const error = new Error('network down');
    mockedSearch.mockRejectedValueOnce(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useSearch('jazz'));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
  });

  it('clears results when the query becomes too short', async () => {
    const { result, rerender } = renderHook(({ q }) => useSearch(q), {
      initialProps: { q: 'jazz' },
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.results).toEqual(RESULTS);

    rerender({ q: 'j' });

    expect(result.current.results).toEqual([]);
  });

  it('honours a custom debounce delay', () => {
    renderHook(() => useSearch('rock', 500));

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(mockedSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockedSearch).toHaveBeenCalledWith('rock');
  });
});
