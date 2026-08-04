'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseInfiniteScrollOptions {
  /** Called when the sentinel enters the configured root margin. */
  onLoadMore: () => void | Promise<void>;
  /** Whether another page is available. */
  hasMore: boolean;
  /** Prevents triggering while the current page request is in progress. */
  isLoading?: boolean;
  /** Disables observation without removing the sentinel from the DOM. */
  enabled?: boolean;
  /** Distance from the viewport bottom at which loading begins. */
  rootMargin?: string;
  /** Visibility threshold for the sentinel. */
  threshold?: number;
}

export interface UseInfiniteScrollResult {
  sentinelRef: (node: HTMLElement | null) => void;
}

/**
 * Observes a feed sentinel and requests the next page before the user reaches
 * the end of the list. The observer is disabled while there is no next page or
 * while a request is already in progress.
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading = false,
  enabled = true,
  rootMargin = '0px 0px 200px 0px',
  threshold = 0,
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const requestPendingRef = useRef(false);
  const onLoadMoreRef = useRef(onLoadMore);

  onLoadMoreRef.current = onLoadMore;

  const sentinelRef = useCallback((nextNode: HTMLElement | null) => {
    setNode(nextNode);
  }, []);

  useEffect(() => {
    if (!enabled || !hasMore || isLoading || typeof IntersectionObserver === 'undefined' || !node) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!isLoading) requestPendingRef.current = false;
      return;
    }

    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (requestPendingRef.current || isLoading) return;

        requestPendingRef.current = true;

        let result: void | Promise<void>;
        try {
          result = onLoadMoreRef.current();
        } catch {
          requestPendingRef.current = false;
          return;
        }

        void Promise.resolve(result)
          .catch(() => undefined)
          .finally(() => {
            requestPendingRef.current = false;
          });
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      if (observerRef.current === observer) observerRef.current = null;
    };
  }, [enabled, hasMore, isLoading, node, rootMargin, threshold]);

  return { sentinelRef };
}

export default useInfiniteScroll;
