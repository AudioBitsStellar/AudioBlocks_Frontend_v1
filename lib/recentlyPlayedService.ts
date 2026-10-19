import type { Track } from '@/context/PlaybackContext';
import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

/** Local and remote history are both capped at this many tracks. */
export const MAX_RECENTLY_PLAYED = 20;

// The backend track shape is not final, so every field is read defensively.
interface RemoteTrack {
  id?: unknown;
  title?: unknown;
  artist?: unknown;
  artistName?: unknown;
  cover?: unknown;
  coverUrl?: unknown;
  imageUrl?: unknown;
  url?: unknown;
}

const asString = (value: unknown) => (typeof value === 'string' ? value : '');

function toTrack(item: RemoteTrack): Track | null {
  const { id, title } = item;
  if ((typeof id !== 'string' && typeof id !== 'number') || typeof title !== 'string') return null;

  return {
    id: String(id),
    title,
    artist: asString(item.artist) || asString(item.artistName),
    cover: asString(item.cover) || asString(item.coverUrl) || asString(item.imageUrl),
    url: asString(item.url) || undefined,
  };
}

/**
 * Loads the signed-in user's listening history from the backend, most recent first.
 * Items without an id or title are dropped.
 */
export async function getRemoteRecentlyPlayed(): Promise<Track[]> {
  const res = await apiClient.get(API_ENDPOINTS.RECENTLY_PLAYED);
  const items: unknown = res.data?.data ?? res.data;
  if (!Array.isArray(items)) return [];

  return (items as RemoteTrack[])
    .map(toTrack)
    .filter((track): track is Track => track !== null)
    .slice(0, MAX_RECENTLY_PLAYED);
}

/** Deletes the signed-in user's listening history on the backend. */
export async function clearRemoteRecentlyPlayed(): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.RECENTLY_PLAYED);
}

/**
 * Combines local and backend history. Backend results come first. Local plays that are
 * newer than the backend's latest track (the local list is most recent first, so they sit
 * before it) are prepended. If the backend's latest track is not in the local list, every
 * local play is kept. Duplicates are removed, keeping the first occurrence.
 */
export function mergeRecentlyPlayed(
  local: Track[],
  remote: Track[],
  limit = MAX_RECENTLY_PLAYED
): Track[] {
  let newerLocal = local;
  if (remote.length > 0) {
    const anchorIndex = local.findIndex((track) => track.id === remote[0].id);
    if (anchorIndex !== -1) newerLocal = local.slice(0, anchorIndex);
  }

  const seen = new Set<string>();
  const merged: Track[] = [];
  for (const track of [...newerLocal, ...remote]) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    merged.push(track);
  }

  return merged.slice(0, limit);
}
