'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRecentlyPlayed } from './useRecentlyPlayed';
import type { Track } from '@/context/PlaybackContext';

type PersonalizationData = {
  songs: Track[];
  reason: {
    type: 'artist' | 'genre';
    name: string;
  };
};

export function usePersonalizationRow(): PersonalizationData | null {
  const { recentlyPlayed } = useRecentlyPlayed();

  const topGenreAndArtist = useMemo(() => {
    if (!recentlyPlayed || recentlyPlayed.length === 0) {
      return null;
    }

    const genreFreq: { [key: string]: number } = {};
    const artistFreq: { [key: string]: string } = {};
    const recentlyPlayedIds = new Set(recentlyPlayed.map((t) => t.id));

    recentlyPlayed.forEach((track) => {
      genreFreq[track.genre || 'unknown'] = (genreFreq[track.genre || 'unknown'] || 0) + 1;
      artistFreq[track.artist] = track.id;
    });

    const topGenre = Object.entries(genreFreq).sort(([, a], [, b]) => b - a)[0]?.[0];
    const topArtist = Object.entries(artistFreq).sort(() => Math.random() - 0.5)[0]?.[0];

    if (!topGenre && !topArtist) return null;

    return {
      type: topGenre && recentlyPlayed.length >= 3 ? ('genre' as const) : ('artist' as const),
      name: topGenre && recentlyPlayed.length >= 3 ? topGenre : topArtist,
    };
  }, [recentlyPlayed]);

  const { data } = useQuery<PersonalizationData | null>({
    queryKey: ['personalization', topGenreAndArtist?.type, topGenreAndArtist?.name],
    queryFn: async () => {
      if (!topGenreAndArtist) return null;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

        if (topGenreAndArtist.type === 'genre') {
          const response = await fetch(
            `${apiUrl}/genres/${encodeURIComponent(topGenreAndArtist.name)}/songs?limit=10`
          );
          if (!response.ok) throw new Error('Failed to fetch genre songs');
          const songs = await response.json();
          return {
            songs: songs.filter((s: Track) => !new Set(recentlyPlayed.map((t) => t.id)).has(s.id)).slice(0, 6),
            reason: topGenreAndArtist,
          };
        } else {
          const response = await fetch(
            `${apiUrl}/artists/${encodeURIComponent(topGenreAndArtist.name)}/songs?limit=10`
          );
          if (!response.ok) throw new Error('Failed to fetch artist songs');
          const songs = await response.json();
          return {
            songs: songs.filter((s: Track) => !new Set(recentlyPlayed.map((t) => t.id)).has(s.id)).slice(0, 6),
            reason: topGenreAndArtist,
          };
        }
      } catch {
        return null;
      }
    },
    enabled: !!topGenreAndArtist && recentlyPlayed.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return data || null;
}
