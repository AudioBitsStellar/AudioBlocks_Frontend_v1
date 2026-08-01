import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInfiniteQuery, type InfinitePage, type PageParam } from '@/hooks/useInfiniteQuery';

type Item = { id: string };

function makeFetcher(pages: Record<string, InfinitePage<Item>>) {
  return vi.fn(async (cursor: PageParam, _signal: AbortSignal): Promise<InfinitePage<Item>> => {
    const key = cursor === null || cursor === undefined ? 'start' : String(cursor);
    const page = pages[key];
    if (!page) return { data: [], nextCursor: null };
    return page;
  });
}

describe('useInfiniteQuery', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the first page and accumulates data', async () => {
    const fetcher = makeFetcher({
      start: { data: [{ id: '1' }, { id: '2' }], nextCursor: 'p2' },
      p2: { data: [{ id: '3' }], nextCursor: null },
    });

    const { result } = renderHook(() => useInfiniteQuery<Item>({ key: 'items', fetcher }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.pages).toHaveLength(1);
  });

  it('fetchNextPage appends the next page', async () => {
    const fetcher = makeFetcher({
      start: { data: [{ id: '1' }], nextCursor: 'p2' },
      p2: { data: [{ id: '2' }], nextCursor: null },
    });

    const { result } = renderHook(() => useInfiniteQuery<Item>({ key: 'items-more', fetcher }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    expect(result.current.data).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.pages).toHaveLength(2);
  });

  it('handles empty data and end-of-data gracefully', async () => {
    const fetcher = makeFetcher({
      start: { data: [], nextCursor: null },
    });

    const { result } = renderHook(() => useInfiniteQuery<Item>({ key: 'empty', fetcher }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('refetch resets pagination', async () => {
    let call = 0;
    const fetcher = vi.fn(async (_cursor: PageParam): Promise<InfinitePage<Item>> => {
      call += 1;
      if (call === 1) return { data: [{ id: 'old' }], nextCursor: 'next' };
      return { data: [{ id: 'fresh' }], nextCursor: null };
    });

    const { result } = renderHook(() => useInfiniteQuery<Item>({ key: 'refetch-key', fetcher }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data[0]?.id).toBe('old');

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ id: 'fresh' }]);
    expect(result.current.pages).toHaveLength(1);
  });

  it('surfaces fetcher errors', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('boom');
    });

    const { result } = renderHook(() => useInfiniteQuery<Item>({ key: 'err', fetcher }));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.isLoading).toBe(false);
  });

  it('aborts in-flight requests when the key changes', async () => {
    let resolveFirst: ((value: InfinitePage<Item>) => void) | null = null;

    let callCount = 0;
    const fetcher = vi.fn((cursor: PageParam, signal: AbortSignal) => {
      callCount++;
      if (callCount === 1) {
        return new Promise<InfinitePage<Item>>((resolve, reject) => {
          resolveFirst = resolve;
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
          );
        });
      }
      return Promise.resolve({ data: [{ id: 'b' }], nextCursor: null });
    });

    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useInfiniteQuery<Item>({ key, fetcher }),
      { initialProps: { key: 'a' } }
    );

    expect(result.current.isLoading).toBe(true);

    rerender({ key: 'b' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ id: 'b' }]);

    // Resolving the aborted first request should not overwrite newer data
    await act(async () => {
      resolveFirst?.({ data: [{ id: 'stale' }], nextCursor: null });
    });
    expect(result.current.data).toEqual([{ id: 'b' }]);
  });

  it('accepts initialData without an immediate fetch', async () => {
    const fetcher = vi.fn(
      async (): Promise<InfinitePage<Item>> => ({
        data: [{ id: 'server' }],
        nextCursor: null,
      })
    );

    const { result } = renderHook(() =>
      useInfiniteQuery<Item>({
        key: 'seeded',
        fetcher,
        initialData: [{ id: 'seed' }],
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual([{ id: 'seed' }]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
