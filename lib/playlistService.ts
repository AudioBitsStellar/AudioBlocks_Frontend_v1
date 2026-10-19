import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

export interface PlaylistSummary {
  id: string;
  name: string;
  description?: string | null;
  /** Owner's user id. Compared with the signed-in profile id to hide follow on own playlists. */
  userId: string;
  isPublic?: boolean;
  isRuleBased?: boolean;
  songs?: unknown[];
}

export interface FollowedPlaylistEntry {
  playlist: PlaylistSummary;
  followedAt: string;
}

/** Fetches one playlist with its songs. Public playlists are readable by anyone. */
export async function getPlaylist(playlistId: string): Promise<PlaylistSummary> {
  const res = await apiClient.get(API_ENDPOINTS.PLAYLIST(playlistId));
  return res.data?.data ?? res.data;
}

/** Lists the playlists the signed-in user follows (first page). */
export async function listFollowedPlaylists(): Promise<PlaylistSummary[]> {
  const res = await apiClient.get(API_ENDPOINTS.PLAYLISTS_FOLLOWED);
  const entries: FollowedPlaylistEntry[] = res.data?.data ?? [];
  return entries.map((entry) => entry.playlist).filter((playlist) => !!playlist?.id);
}

/** Creates a playlist. Pass `isRuleBased: true` with a rule to create a smart playlist. */
export async function createPlaylist(payload: object): Promise<PlaylistSummary> {
  const res = await apiClient.post(API_ENDPOINTS.PLAYLISTS, payload);
  return res.data?.data ?? res.data;
}

export async function followPlaylist(playlistId: string): Promise<void> {
  await apiClient.post(API_ENDPOINTS.PLAYLIST_FOLLOW(playlistId));
}

export async function unfollowPlaylist(playlistId: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.PLAYLIST_FOLLOW(playlistId));
}
