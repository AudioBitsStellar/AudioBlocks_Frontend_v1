import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { collectionKeys } from '@/hooks/queries/collections';
import { userKeys } from '@/hooks/queries/users';
import { usePrefetchCollection, usePrefetchArtist } from '@/hooks/usePrefetch';

function createWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('usePrefetchCollection', () => {
  it('prefetches collection detail after the hover delay', async () => {
    const queryClient = new QueryClient();
    const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');

    const { result } = renderHook(() => usePrefetchCollection('col-1'), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.onMouseEnter());
    expect(prefetchSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();
    });

    expect(prefetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: collectionKeys.detail('col-1') })
    );
  });

  it('cancels the prefetch if the pointer leaves before the delay elapses', async () => {
    const queryClient = new QueryClient();
    const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');

    const { result } = renderHook(() => usePrefetchCollection('col-1'), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.onMouseEnter());
    act(() => result.current.onMouseLeave());

    await act(async () => {
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('does not fetch when data-saver mode is enabled', async () => {
    vi.stubGlobal('navigator', { ...navigator, connection: { saveData: true } });
    const queryClient = new QueryClient();
    const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');

    const { result } = renderHook(() => usePrefetchCollection('col-1'), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.onMouseEnter());
    await act(async () => {
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('skips prefetch when data is already cached', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(collectionKeys.detail('col-1'), { id: 'col-1' });
    const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');

    const { result } = renderHook(() => usePrefetchCollection('col-1'), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.onMouseEnter());
    await act(async () => {
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });
});

describe('usePrefetchArtist', () => {
  it('prefetches the artist profile after the hover delay', async () => {
    const queryClient = new QueryClient();
    const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');

    const { result } = renderHook(() => usePrefetchArtist('user-1'), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.onMouseEnter());
    await act(async () => {
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();
    });

    expect(prefetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: userKeys.profile('user-1') })
    );
  });

  it('does nothing when no id is provided', async () => {
    const queryClient = new QueryClient();
    const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');

    const { result } = renderHook(() => usePrefetchArtist(undefined), {
      wrapper: createWrapper(queryClient),
    });

    act(() => result.current.onMouseEnter());
    await act(async () => {
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();
    });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });
});
