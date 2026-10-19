'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';
import {
  createPlaylist,
  followPlaylist,
  getPlaylist,
  listFollowedPlaylists,
  unfollowPlaylist,
} from '@/lib/playlistService';
import type { PlaylistSummary } from '@/lib/playlistService';
import type { SmartPlaylistPayload } from '@/lib/smartPlaylist';

export const PLAYLIST_QUERY_KEYS = {
  all: ['playlists'] as const,
  detail: (playlistId: string) => ['playlists', 'detail', playlistId] as const,
  followed: ['playlists', 'followed'] as const,
};

/** Loads one playlist. Disabled until an id is available. */
export function usePlaylist(playlistId: string | undefined) {
  return useQuery({
    queryKey: PLAYLIST_QUERY_KEYS.detail(playlistId ?? ''),
    queryFn: () => getPlaylist(playlistId as string),
    enabled: !!playlistId,
    staleTime: CACHE_DURATIONS.SHORT,
    // A missing playlist is a definitive answer, so do not retry it.
    retry: false,
  });
}

/** Loads the playlists the signed-in user follows. Pass `enabled: false` when signed out. */
export function useFollowedPlaylists(enabled = true) {
  return useQuery({
    queryKey: PLAYLIST_QUERY_KEYS.followed,
    queryFn: listFollowedPlaylists,
    enabled,
    staleTime: CACHE_DURATIONS.SHORT,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

interface ToggleFollowVariables {
  playlist: PlaylistSummary;
  follow: boolean;
}

/**
 * Follows or unfollows a playlist. The followed list is updated before the request
 * finishes, and restored if the request fails.
 */
export function useToggleFollowPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlist, follow }: ToggleFollowVariables) =>
      follow ? followPlaylist(playlist.id) : unfollowPlaylist(playlist.id),
    onMutate: async ({ playlist, follow }: ToggleFollowVariables) => {
      await queryClient.cancelQueries({ queryKey: PLAYLIST_QUERY_KEYS.followed });
      const previous = queryClient.getQueryData<PlaylistSummary[]>(PLAYLIST_QUERY_KEYS.followed);

      queryClient.setQueryData<PlaylistSummary[]>(PLAYLIST_QUERY_KEYS.followed, (current = []) => {
        const without = current.filter((item) => item.id !== playlist.id);
        return follow ? [...without, playlist] : without;
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(PLAYLIST_QUERY_KEYS.followed, context?.previous);
      toast.error('Could not update this playlist. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PLAYLIST_QUERY_KEYS.followed });
    },
  });
}

/** Creates a smart playlist from a validated rule (#580). */
export function useCreateSmartPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SmartPlaylistPayload) => createPlaylist(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYLIST_QUERY_KEYS.all });
      toast.success('Smart playlist created');
    },
    onError: () => {
      toast.error('Could not create the smart playlist. Please try again.');
    },
  });
}
