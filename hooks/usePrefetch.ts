'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { collectionKeys, fetchCollectionDetail } from '@/hooks/queries/collections';
import { userKeys, fetchUserProfile } from '@/hooks/queries/users';
import { CACHE_DURATIONS } from '@/lib/constants';

const HOVER_PREFETCH_DELAY = 200;

function isDataSaverEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !!connection?.saveData;
}

/** Schedules work at low priority so it never competes with user-driven rendering. */
function runWhenIdle(callback: () => void): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 0);
  }
}

export function prefetchCollection(queryClient: QueryClient, id: string): void {
  if (!id || isDataSaverEnabled()) return;
  if (queryClient.getQueryData(collectionKeys.detail(id))) return;

  runWhenIdle(() => {
    queryClient.prefetchQuery({
      queryKey: collectionKeys.detail(id),
      queryFn: () => fetchCollectionDetail(id),
      staleTime: CACHE_DURATIONS.LONG,
    });
  });
}

export function prefetchArtist(queryClient: QueryClient, artistId: string): void {
  if (!artistId || isDataSaverEnabled()) return;
  if (queryClient.getQueryData(userKeys.profile(artistId))) return;

  runWhenIdle(() => {
    queryClient.prefetchQuery({
      queryKey: userKeys.profile(artistId),
      queryFn: () => fetchUserProfile(artistId),
      staleTime: CACHE_DURATIONS.MEDIUM,
    });
  });
}

type PrefetchFn = (queryClient: QueryClient, id: string) => void;

/** Fires `prefetchFn` after a hover delay; cancels if the pointer leaves before it elapses. */
function useHoverPrefetch(prefetchFn: PrefetchFn, id: string | undefined, delay = HOVER_PREFETCH_DELAY) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (!id) return;
    timeoutRef.current = setTimeout(() => prefetchFn(queryClient, id), delay);
  }, [id, delay, prefetchFn, queryClient]);

  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { onMouseEnter, onMouseLeave };
}

/** Spread onto a collection card to prefetch its detail data on hover. */
export function usePrefetchCollection(collectionId: string | undefined) {
  return useHoverPrefetch(prefetchCollection, collectionId);
}

/** Spread onto an artist name/link to prefetch their profile data on hover. */
export function usePrefetchArtist(artistId: string | undefined) {
  return useHoverPrefetch(prefetchArtist, artistId);
}
