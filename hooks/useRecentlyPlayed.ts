'use client';

import { useEffect, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePlayback } from '@/context/PlaybackContext';
import type { Track } from '@/context/PlaybackContext';

const MAX_RECENT = 20;
const STORAGE_KEY = 'audioblocks_recently_played';

export function useRecentlyPlayed() {
  const [recentlyPlayed, setRecentlyPlayed] = useLocalStorage<Track[]>(STORAGE_KEY, []);
  const { playlist, currentIndex, addToRecentlyPlayed } = usePlayback();

  const currentTrack = playlist[currentIndex];

  useEffect(() => {
    if (!currentTrack) return;
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== currentTrack.id);
      return [currentTrack, ...filtered].slice(0, MAX_RECENT);
    });
  }, [currentTrack?.id]);

  const addTrack = useCallback((track: Track) => {
    addToRecentlyPlayed(track);
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, MAX_RECENT);
    });
  }, [addToRecentlyPlayed, setRecentlyPlayed]);

  const clearAll = useCallback(() => {
    setRecentlyPlayed(null);
  }, [setRecentlyPlayed]);

  return { recentlyPlayed, addTrack, clearAll };
}
