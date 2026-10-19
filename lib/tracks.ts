import type { Track } from '@/context/PlaybackContext';

export interface SongResponse {
  id: string;
  title: string;
  artist?: string | { id?: string; name?: string; username?: string };
  user?: { id?: string; name?: string; username?: string };
  artistId?: string;
  coverArtPath?: string;
  coverArt?: string;
  cover?: string | { path?: string };
  duration?: number;
  status?: string;
  flagged?: boolean;
  available?: boolean;
  isAvailable?: boolean;
  hlsMasterUrl?: string | null;
  streamUrl?: string | null;
  url?: string | null;
}

/** Matches SongController.streamSong; missing stream metadata fails closed at the API boundary. */
export function songToTrack(song: SongResponse | null | undefined, fallbackId = ''): Track {
  const artist = song?.artist ?? song?.user;
  const stream = song?.streamUrl || song?.hlsMasterUrl || song?.url;
  return {
    id: String(song?.id ?? fallbackId),
    title: song?.title ?? 'Deleted song',
    artist:
      typeof artist === 'string' ? artist : artist?.name || artist?.username || 'Unknown artist',
    cover:
      song?.coverArtPath ||
      song?.coverArt ||
      (typeof song?.cover === 'string' ? song.cover : song?.cover?.path) ||
      '/placeholder-cover.svg',
    duration: song?.duration,
    available:
      !!song &&
      song.available !== false &&
      song.isAvailable !== false &&
      !song.flagged &&
      (song.status === undefined || song.status === 'ready') &&
      !!stream,
    // Backend songs must use the signed streaming endpoint, never an S3 master URL.
    url: song?.url || undefined,
  };
}

/** Legacy/on-chain tracks may resolve their stream by id; explicit API availability always wins. */
export function isTrackAvailable(track: Track | null | undefined): boolean {
  return (
    !!track &&
    track.available !== false &&
    !track.flagged &&
    (track.status === undefined || track.status === 'ready')
  );
}
export const UNAVAILABLE_REASON =
  'This song was removed, is under review, or is no longer available to stream.';

export function shuffleTracks<T>(tracks: readonly T[]): T[] {
  const result = [...tracks];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
