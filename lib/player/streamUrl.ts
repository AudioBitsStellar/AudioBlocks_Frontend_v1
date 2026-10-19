import type { Track } from '@/context/PlaybackContext';

/**
 * Backend streaming endpoint for a track id. The single place stream URLs are
 * built (#602), so changes such as HLS manifests land here once.
 */
export function buildStreamUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL || ''}/stream/${id}`;
}

/**
 * A track's direct `url` wins; otherwise it streams from the backend by id,
 * falling back to its playlist position when the id is missing.
 */
export function resolveStreamUrl(track: Track | undefined, index: number): string {
  if (!track) return '';
  return track.url || buildStreamUrl(track.id || `track-${index}`);
}
