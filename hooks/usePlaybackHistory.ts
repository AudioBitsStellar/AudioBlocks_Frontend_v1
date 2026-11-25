'use client';

/**
 * #117: consumer-facing hook for the playback history slice of PlaybackContext.
 *
 * `PlaybackContext` owns the full history list and its persistence; this hook
 * narrows the surface to what UI code actually needs (the raw history, the
 * recorder, the clearer, and the de-duplicated last-N accessor) so views do
 * not import the whole context value. It subscribes via `usePlaybackSelector`
 * so a component that only reads history does not re-render when the
 * playlist, volume, queue, or any unrelated slice changes.
 */

import { useCallback, useMemo } from 'react';
import {
  type PlaybackEvent,
  usePlaybackActions,
  usePlaybackSelector,
} from '@/context/PlaybackContext';

export interface UsePlaybackHistory {
  /** Raw ordered playback history (newest first), as stored in context. */
  history: PlaybackEvent[];
  /** The last `n` unique tracks the user played, newest first. Default 20. */
  getRecentlyPlayed: (n?: number) => PlaybackEvent[];
  /** Record one play event. Consecutive plays of the same track are merged. */
  recordPlay: (trackId: string, durationPlayed: number) => void;
  /** Explicit user action: wipe all history (both memory and persisted). */
  clearHistory: () => void;
}

export function usePlaybackHistory(): UsePlaybackHistory {
  const history = usePlaybackSelector((s) => s.history);
  const { recordPlay, clearHistory, getRecentlyPlayed: ctxGetRecentlyPlayed } =
    usePlaybackActions();

  // Memoise so consumers can rely on a stable reference across renders.
  // `ctxGetRecentlyPlayed` already reads the ref inside PlaybackContext so it
  // sees the latest history even though the action identity never changes.
  const getRecentlyPlayed = useCallback(
    (n?: number) => ctxGetRecentlyPlayed(n),
    [ctxGetRecentlyPlayed]
  );

  return useMemo(
    () => ({ history, getRecentlyPlayed, recordPlay, clearHistory }),
    [history, getRecentlyPlayed, recordPlay, clearHistory]
  );
}
