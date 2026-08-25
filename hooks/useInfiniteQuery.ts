'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type PageParam = string | number | null;

export interface InfinitePage<TData> {
  data: TData[];
  nextCursor: PageParam;
}

export type InfiniteFetcher<TData> = (
  cursor: PageParam,
  signal: AbortSignal
) => Promise<InfinitePage<TData>>;

export interface UseInfiniteQueryOptions<TData> {
  /** Cache identity key — refetch resets when this changes. */
  key: string | readonly unknown[];
  fetcher: InfiniteFetcher<TData>;
  initialData?: TData[];
  /** Starting cursor passed on the first page request. Defaults to null. */
  initialCursor?: PageParam;
  enabled?: boolean;
}

export interface UseInfiniteQueryResult<TData> {
  pages: TData[][];
  /** Flattened accumulation of all loaded page items. */
  data: TData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: Error | null;
  fetchNextPage: () => Promise<void>;
  refetch: () => Promise<void>;
}

function serializeKey(key: string | readonly unknown[]): string {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

/**
 * Lightweight cursor-based infinite query hook.
 * Accumulates pages, supports AbortController cancellation, and exposes
 * loading / hasNextPage / fetchNextPage / refetch states.
 */
export function useInfiniteQuery<TData>({
  key,
  fetcher,
  initialData,
  initialCursor = null,
  enabled = true,
}: UseInfiniteQueryOptions<TData>): UseInfiniteQueryResult<TData> {
  const keyStr = serializeKey(key);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  const [pages, setPages] = useState<TData[][]>(() =>
    initialData && initialData.length > 0 ? [initialData] : []
  );
  const [cursor, setCursor] = useState<PageParam>(initialCursor);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(enabled && !(initialData && initialData.length > 0));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const cancelInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const loadPage = useCallback(
    async (pageCursor: PageParam, mode: 'initial' | 'more' | 'refetch') => {
      if (inFlightRef.current && mode === 'more') return;

      cancelInFlight();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;
      inFlightRef.current = true;

      if (mode === 'more') {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const page = await fetcherRef.current(pageCursor, controller.signal);
        if (requestId !== requestIdRef.current || controller.signal.aborted) return;

        const items = page.data ?? [];
        const next = page.nextCursor ?? null;
        const ended = next === null || next === undefined || items.length === 0;

        setPages((prev) => (mode === 'more' ? [...prev, items] : [items]));
        setCursor(next);
        setHasNextPage(!ended);
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        if (mode !== 'more') {
          setPages([]);
          setHasNextPage(false);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          inFlightRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
          if (abortRef.current === controller) {
            abortRef.current = null;
          }
        }
      }
    },
    [cancelInFlight]
  );

  // Initial load / key change
  useEffect(() => {
    if (!enabled) {
      cancelInFlight();
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    const currentInitialData = initialDataRef.current;
    const hasInitial = Boolean(currentInitialData && currentInitialData.length > 0);

    setPages(hasInitial && currentInitialData ? [currentInitialData] : []);
    setCursor(initialCursor);
    setHasNextPage(true);
    setError(null);

    if (hasInitial) {
      setIsLoading(false);
      return;
    }

    void loadPage(initialCursor, 'initial');

    return () => {
      cancelInFlight();
    };
  }, [keyStr, enabled, initialCursor, loadPage, cancelInFlight]);

  const fetchNextPage = useCallback(async () => {
    if (!enabled || !hasNextPage || isLoading || isLoadingMore || inFlightRef.current) {
      return;
    }
    await loadPage(cursor, 'more');
  }, [enabled, hasNextPage, isLoading, isLoadingMore, cursor, loadPage]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setPages([]);
    setCursor(initialCursor);
    setHasNextPage(true);
    await loadPage(initialCursor, 'refetch');
  }, [enabled, initialCursor, loadPage]);

  const data = pages.flat();

  return {
    pages,
    data,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  };
}

export default useInfiniteQuery;
