import { useQuery } from '@tanstack/react-query';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';
import { fetchSongLyrics } from '@/lib/lyricsService';

export const songLyricsKey = (songId: string) => ['song-lyrics', songId] as const;

/**
 * Lyrics for one song, keyed by song ID (#583). `data` is `null` when the song
 * has no lyrics. The query is off until `enabled` is true, so the full-screen
 * player only fetches once the Lyrics panel is open.
 */
export function useSongLyrics(songId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: songLyricsKey(songId ?? ''),
    queryFn: () => fetchSongLyrics(songId ?? ''),
    enabled: enabled && !!songId,
    staleTime: CACHE_DURATIONS.LONG,
    retry: RETRY_CONFIG.DEFAULT,
  });
}
