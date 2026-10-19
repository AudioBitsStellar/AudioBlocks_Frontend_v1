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
      ) : !data?.data?.length ? (
        <p>Your playlists are empty.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.data.map((playlist) => (
            <li key={playlist.id}>
              <Link
                className="block rounded-xl border border-border-dark p-5"
                href={`/dashboard/playlist/${encodeURIComponent(playlist.id)}`}
              >
                {playlist.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Playlist pages" className="flex gap-4">
        <button disabled={page === 1} type="button" onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={!data || page >= (data.pagination?.totalPages ?? 1)}
          type="button"
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
