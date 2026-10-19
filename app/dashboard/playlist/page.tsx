'use client';

import { useState, useEffect, useMemo } from 'react';
import { GripVertical, Play, Trash2, Loader2, Shield } from 'lucide-react';
import { usePlayback } from '@/context/PlaybackContext';
import CollaboratorsPanel from '@/components/playlist/CollaboratorsPanel';
import { CreateSmartPlaylistDialog } from '@/components/playlist/CreateSmartPlaylistDialog';
import { FollowedPlaylistsList } from '@/components/playlist/FollowedPlaylistsList';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import { useQuery } from '@tanstack/react-query';

interface Track {
  id: string | number;
  title: string;
  artist?: string;
  cover?: string;
  url?: string;
  coverUrl?: string;
}

const Playlist = () => {
  const { playTrack, currentIndex, playlist, isPlaying } = usePlayback();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSmartDialogOpen, setIsSmartDialogOpen] = useState(false);
  const signedIn = useHasAuthSession();

  // Fetch playlists from backend (Issue #617)
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/playlists');
        if (!response.ok) throw new Error('Failed to fetch playlists');
        const data = await response.json();
        setTracks(data.tracks || []);
      } catch (err) {
        // Fallback to empty playlist if backend unavailable
        console.error('Error fetching playlists:', err);
        setTracks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const handleDrop = (targetTrackId: string) => {
    if (!draggedTrackId || draggedTrackId === targetTrackId) {
      setDraggedTrackId(null);
      return;
    }

    setTracks((currentTracks) => {
      const draggedIndex = currentTracks.findIndex((track) => track.id === draggedTrackId);
      const targetIndex = currentTracks.findIndex((track) => track.id === targetTrackId);

      if (draggedIndex < 0 || targetIndex < 0) return currentTracks;

      const reorderedTracks = [...currentTracks];
      const [draggedTrack] = reorderedTracks.splice(draggedIndex, 1);
      reorderedTracks.splice(targetIndex, 0, draggedTrack);
      return reorderedTracks;
    });

    setDraggedTrackId(null);
  };

  const handleRemove = (trackId: string) => {
    setTracks((currentTracks) => currentTracks.filter((track) => track.id !== trackId));
  };

  return (
    <div className="font-inter">
      <p className="text-xs font-medium text-left text-white mb-2">My Playlist</p>

      <div className="bg-gradient-to-r from-[#6E0596] to-[#580577] p-8 py-12 rounded-lg text-white flex items-center justify-between mb-6">
        <div className="flex-1 gap-2">
          <h1 className="md:text-6xl text-3xl mb-2 font-extrabold">My Playlist</h1>
          <p className="font-semibold text-base">
            {tracks.length} {tracks.length === 1 ? 'Song' : 'Songs'} Added
          </p>
        </div>
      </div>

      {signedIn && (
        <div className="mb-6 flex justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-[#D2045B] text-sm font-semibold text-white hover:bg-[#b80350] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
            type="button"
            onClick={() => setIsSmartDialogOpen(true)}
          >
            New smart playlist
          </button>
          <CreateSmartPlaylistDialog
            open={isSmartDialogOpen}
            onClose={() => setIsSmartDialogOpen(false)}
          />
        </div>
      )}

      <FollowedPlaylistsList className="mb-6" />

      {loading ? (
        <div className="rounded-lg border border-border-dark p-8 text-center text-on-muted flex items-center justify-center gap-3">
          <Loader2 size={20} className="animate-spin" />
          Loading playlist...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-400/50 bg-red-400/10 p-8 text-center text-red-400">
          Failed to load playlist. Please try again.
        </div>
      ) : tracks.length === 0 ? (
        <div className="rounded-lg border border-border-dark p-8 text-center text-on-muted">
          Your playlist is empty.
        </div>
      ) : (
        <div aria-label="Playlist tracks" className="flex flex-col gap-2">
          {tracks.map((track, i) => {
            const globalIndex = playlist.findIndex(
              (playlistTrack) => playlistTrack.url === track.url
            );
            const isActive = globalIndex >= 0 && globalIndex === currentIndex && isPlaying;

            return (
              <div
                key={track.id}
                draggable
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-surface border border-border-dark' : 'hover:bg-surface-hover'
                } ${draggedTrackId === track.id ? 'opacity-50' : ''}`}
                onDragEnd={() => setDraggedTrackId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDraggedTrackId(track.id)}
                onDrop={() => handleDrop(track.id)}
              >
                <button
                  aria-label={`Reorder ${track.title}`}
                  className="cursor-grab text-on-muted hover:text-white touch-none"
                  title="Drag to reorder"
                  type="button"
                >
                  <GripVertical size={20} />
                </button>

                <button
                  aria-label={`Play ${track.title}`}
                  className="flex flex-1 min-w-0 items-center gap-4 text-left cursor-pointer"
                  type="button"
                  onClick={() => playTrack(track)}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand shrink-0">
                    <Play className="text-white ml-0.5" size={14} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-sm font-semibold truncate ${
                        isActive ? 'text-brand' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </span>
                    <span className="block text-xs text-on-muted truncate">{track.artist}</span>
                  </span>
                </button>

                <span className="text-xs text-on-muted shrink-0">{i + 1}</span>

                <button
                  aria-label={`Remove ${track.title} from playlist`}
                  className="p-2 rounded-md text-on-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Remove from playlist"
                  type="button"
                  onClick={() => handleRemove(track.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Playlist;
