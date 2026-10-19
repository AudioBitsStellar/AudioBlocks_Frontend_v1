'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlayback } from '@/context/PlaybackContext';
import type { Track } from '@/context/PlaybackContext';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';
import {
  clearRemoteRecentlyPlayed,
  getRemoteRecentlyPlayed,
  mergeRecentlyPlayed,
} from '@/lib/recentlyPlayedService';

export const RECENTLY_PLAYED_QUERY_KEY = ['recently-played'] as const;

/**
 * Recently played tracks. Local history from PlaybackContext is shown first for an
 * instant paint. For signed-in users, backend history is merged in, so it follows the
 * account across browsers. Signed-out users see local history only.
 */
export function useRecentlyPlayed() {
  const queryClient = useQueryClient();
  const signedIn = useHasAuthSession();
  const { recentlyPlayed: localTracks, clearRecentlyPlayed } = usePlayback();

  const remote = useQuery({
    queryKey: RECENTLY_PLAYED_QUERY_KEY,
    queryFn: getRemoteRecentlyPlayed,
    enabled: signedIn,
    staleTime: CACHE_DURATIONS.SHORT,
    retry: RETRY_CONFIG.DEFAULT,
  });

  const recentlyPlayed = useMemo(
    () => mergeRecentlyPlayed(localTracks, remote.data ?? []),
    [localTracks, remote.data]
  );

  /**
   * Clears history on the backend (when signed in) and in this browser. If the backend
   * call fails, it throws and local history is kept, so the user can retry.
   */
  const clearHistory = useCallback(async () => {
    if (signedIn) {
      await clearRemoteRecentlyPlayed();
    }
    clearRecentlyPlayed();
    queryClient.setQueryData<Track[]>(RECENTLY_PLAYED_QUERY_KEY, []);
  }, [signedIn, clearRecentlyPlayed, queryClient]);

  return { recentlyPlayed, isLoading: remote.isLoading, clearHistory };
}
