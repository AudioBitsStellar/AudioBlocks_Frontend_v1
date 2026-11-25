'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GripVertical, Play, Trash2, Loader2, Shield } from 'lucide-react';
import { usePlayback } from '@/context/PlaybackContext';
import CollaboratorsPanel from '@/components/playlist/CollaboratorsPanel';
import { CreateSmartPlaylistDialog } from '@/components/playlist/CreateSmartPlaylistDialog';
import { FollowedPlaylistsList } from '@/components/playlist/FollowedPlaylistsList';
import apiClient from '@/lib/apiClient';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Track {
  id: string | number;
  title: string;
  artist?: string;
  cover?: string;
  url?: string;
  coverUrl?: string;
}

export default function Playlist() {
  const { playTrack, currentIndex, playlist, isPlaying } = usePlayback();
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [isSmartDialogOpen, setIsSmartDialogOpen] = useState(false);
  const signedIn = useHasAuthSession();
  const queryClient = useQueryClient();

  const playlistQuery = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const response = await apiClient.get('/api/playlists');
      return response.data;
    },
  });

  const playlists = playlistQuery.data?.data || playlistQuery.data?.playlists || (Array.isArray(playlistQuery.data) ? playlistQuery.data : []);
  const currentPlaylist = playlists[0];
  const playlistId = currentPlaylist?.id;
  const tracks: Track[] = currentPlaylist?.tracks || currentPlaylist?.songs || [];

  const reorderMutation = useMutation({
    mutationFn: async (newTracks: Track[]) => {
      if (!playlistId) return;
      await apiClient.put(`/api/playlists/${playlistId}/reorder`, {
        songIds: newTracks.map((t) => t.id),
      });
    },
    onMutate: async (newTracks) => {
      await queryClient.cancelQueries({ queryKey: ['playlists'] });
      const previousData = queryClient.getQueryData(['playlists']);
      queryClient.setQueryData(['playlists'], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((p, idx) => (idx === 0 ? { ...p, tracks: newTracks, songs: newTracks } : p));
      }
        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((p: any, idx: number) =>
              idx === 0 ? { ...p, tracks: newTracks, songs: newTracks } : p
            ),
    };
        }
        return old;
      });
      return { previousData };
    },
    onError: (_err, _newTracks, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['playlists'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const removeSongMutation = useMutation({
    mutationFn: async (songId: string | number) => {
      if (!playlistId) return;
      await apiClient.delete(`/api/playlists/${playlistId}/songs/${songId}`);
    },
    onMutate: async (songId) => {
      await queryClient.cancelQueries({ queryKey: ['playlists'] });
      const previousData = queryClient.getQueryData(['playlists']);
      queryClient.setQueryData(['playlists'], (old: any) => {
        if (!old) return old;
        const filterTracks = (tList: Track[]) => tList.filter((t) => t.id !== songId);
        if (Array.isArray(old)) {
          return old.map((p, idx) =>
            idx === 0
              ? { ...p, tracks: filterTracks(p.tracks || p.songs || []), songs: filterTracks(p.tracks || p.songs || []) }
              : p
          );
        }
        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((p: any, idx: number) =>
              idx === 0
                ? { ...p, tracks: filterTracks(p.tracks || p.songs || []), songs: filterTracks(p.tracks || p.songs || []) }
                : p
            ),
          };
        }
        return old;
      });
      return { previousData };
    },
    onError: (_err, _songId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['playlists'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const handleDrop = (targetTrackId: string | number) => {
    if (!draggedTrackId || draggedTrackId === targetTrackId) {
      setDraggedTrackId(null);
      return;
    }

    const draggedIndex = tracks.findIndex((track) => track.id === draggedTrackId);
    const targetIndex = tracks.findIndex((track) => track.id === targetTrackId);

    if (draggedIndex < 0 || targetIndex < 0) {
      setDraggedTrackId(null);
      return;
    }

    const reorderedTracks = [...tracks];
      const [draggedTrack] = reorderedTracks.splice(draggedIndex, 1);
      reorderedTracks.splice(targetIndex, 0, draggedTrack);

    setDraggedTrackId(null);
    reorderMutation.mutate(reorderedTracks);
  };

  const handleRemoveTrack = (songId: string | number) => {
    removeSongMutation.mutate(songId);
  };

  if (playlistQuery.isLoading) {
  return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#F2AFC9]" />
      </div>
    );
  }

  if (playlistQuery.isError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center text-white">
          <p className="mb-4">Failed to load playlist</p>
          <button
            className="rounded bg-[#D2045B] px-4 py-2 font-semibold text-white hover:bg-[#D2045B]/80 transition-colors"
            type="button"
            onClick={() => void playlistQuery.refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{currentPlaylist?.name || 'My Playlist'}</h1>
          <p className="text-sm text-gray-400">{currentPlaylist?.description || 'Your custom track collection'}</p>
        </div>
          <button
          className="rounded border border-[#D2045B] px-3 py-1.5 text-sm font-semibold text-[#F2AFC9] hover:bg-[#D2045B]/10"
            type="button"
            onClick={() => setIsSmartDialogOpen(true)}
          >
          Create Smart Playlist
          </button>
        </div>

      <FollowedPlaylistsList />

      {playlistId && <CollaboratorsPanel isOwner={true} playlistId={playlistId} />}

      {tracks.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-12 text-center">
          <p className="text-gray-400">Your playlist is empty.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, index) => {
            const currentPlayingTrack = playlist[currentIndex];
            const isActive = currentPlayingTrack && currentPlayingTrack.id === track.id;

            return (
              <div
                key={track.id}
                draggable
                className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                  isActive ? 'bg-[#D2045B]/20 border border-[#D2045B]/40' : 'bg-gray-900/40 hover:bg-gray-800/60'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDragStart={() => setDraggedTrackId(String(track.id))}
                onDrop={() => handleDrop(track.id)}
              >
                <div className="flex items-center gap-4">
                  <button className="cursor-grab text-gray-500 hover:text-white" type="button">
                    <GripVertical size={18} />
        </button>
        <button
                    className="flex h-10 w-10 items-center justify-center rounded bg-gray-800 text-white hover:bg-[#D2045B]"
          type="button"
                    onClick={() => playTrack(track as any)}
        >
                    <Play size={16} />
        </button>
                  <div>
                    <p className={`font-medium ${isActive ? 'text-[#F2AFC9]' : 'text-white'}`}>{track.title}</p>
                    <p className="text-sm text-gray-400">{track.artist || 'Unknown Artist'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-gray-400 hover:text-red-400"
                    type="button"
                    onClick={() => handleRemoveTrack(track.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateSmartPlaylistDialog open={isSmartDialogOpen} onOpenChange={setIsSmartDialogOpen} />
    </div>
  );
}
