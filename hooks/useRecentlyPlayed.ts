'use client';

import { useEffect, useCallback } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Track } from '@/context/PlaybackContext';

const MAX_RECENT = 20;
const STORAGE_KEY = 'audioblocks_recently_played';

export function useRecentlyPlayed() {
  const [recentlyPlayed, setRecentlyPlayed] = useLocalStorage<Track[]>(STORAGE_KEY, []);
  const { playlist, currentIndex, addToRecentlyPlayed } = usePlayback();

  const currentTrack = playlist[currentIndex];

  useEffect(() => {
    if (!currentTrack) return;
    const filtered = recentlyPlayed.filter((t) => t.id !== currentTrack.id);
    setRecentlyPlayed([currentTrack, ...filtered].slice(0, MAX_RECENT));
  }, [currentTrack, recentlyPlayed, setRecentlyPlayed]);

  const addTrack = useCallback(
    (track: Track) => {
      addToRecentlyPlayed(track);
      const filtered = recentlyPlayed.filter((t) => t.id !== track.id);
      setRecentlyPlayed([track, ...filtered].slice(0, MAX_RECENT));
    },
    [addToRecentlyPlayed, recentlyPlayed, setRecentlyPlayed]
  );

  const clearAll = useCallback(() => {
    setRecentlyPlayed(null);
  }, [setRecentlyPlayed]);

  return { recentlyPlayed, addTrack, clearAll };
}
