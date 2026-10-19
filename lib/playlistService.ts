import apiClient from '@/lib/apiClient';
import { songToTrack, type SongResponse } from '@/lib/tracks';
export interface SavedPlaylist {
  id: string;
  name: string;
  userId: string;
  isRuleBased?: boolean;
  songs: { songId: string; position: number; song: SongResponse | null }[];
}
export async function getPlaylist(id: string): Promise<SavedPlaylist> {
  const response = await apiClient.get(`/api/playlists/${encodeURIComponent(id)}`);
  return response.data.data;
}
export function playlistTracks(playlist: SavedPlaylist) {
  return [...(playlist.songs ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((entry) => songToTrack(entry.song, entry.songId));
}
export async function removePlaylistSong(playlistId: string, songId: string) {
  await apiClient.delete(
    `/api/playlists/${encodeURIComponent(playlistId)}/songs/${encodeURIComponent(songId)}`
  );
}
