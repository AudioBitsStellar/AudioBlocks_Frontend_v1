'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import { FollowPlaylistButton } from '@/components/playlist/FollowPlaylistButton';
import { usePlayback } from '@/context/PlaybackContext';
import { useGetProfile } from '@/hooks/useProfile';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import { usePlaylist } from '@/hooks/usePlaylists';
import type { PlaylistSummary } from '@/lib/playlistService';

export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const signedIn = useHasAuthSession();
  // Backend playlists are private to signed-in users, so only query them with a session.
  const playlistQuery = usePlaylist(signedIn ? id : undefined);

  if (playlistQuery.data) {
    return <SavedPlaylistDetail playlist={playlistQuery.data} />;
  }

  if (playlistQuery.isLoading) {
    return <div className="p-6 text-on-muted">Loading playlist...</div>;
  }

  return <QueuedTrackDetail id={id} />;
}

/** A playlist stored on the backend, with its follow action. */
function SavedPlaylistDetail({ playlist }: { playlist: PlaylistSummary }) {
  const signedIn = useHasAuthSession();
  const songCount = playlist.songs?.length ?? 0;

  return (
    <div className="p-6">
      <Link
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        href="/dashboard/playlist"
      >
        <ArrowLeft size={16} />
        Back to Playlist
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{playlist.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            {playlist.isRuleBased && (
              <span className="rounded-full border border-[#D2045B]/60 px-2 py-0.5 text-xs text-[#F2AFC9]">
                Smart playlist
              </span>
            )}
            <span>
              {songCount} {songCount === 1 ? 'song' : 'songs'}
            </span>
          </div>
          {playlist.description && <p className="text-gray-400">{playlist.description}</p>}
        </div>

        {signedIn && <PlaylistFollowAction playlist={playlist} />}
      </div>
    </div>
  );
}

/** Looks up ownership so the follow button is hidden on the signed-in user's own playlists. */
function PlaylistFollowAction({ playlist }: { playlist: PlaylistSummary }) {
  const profile = useGetProfile();

  // Wait for the profile so the button never flashes on an owned playlist.
  if (!profile.data) return null;

  return (
    <FollowPlaylistButton isOwner={profile.data.id === playlist.userId} playlist={playlist} />
  );
}

/** Fallback view for a queued track id that is not a backend playlist. */
function QueuedTrackDetail({ id }: { id: string }) {
  const { playlist, playTrack } = usePlayback();

  const track = playlist.find((t) => t.id === id);

  if (!track) notFound();

  return (
    <div className="p-6">
      <Link
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        href="/dashboard/playlist"
      >
        <ArrowLeft size={16} />
        Back to Playlist
      </Link>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="relative w-full md:w-64 h-64 rounded-xl overflow-hidden shrink-0 bg-surface-elevated">
          <div
            aria-label={`Play ${track.title}`}
            className="w-full h-full flex items-center justify-center cursor-pointer group"
            role="button"
            tabIndex={0}
            onClick={() => playTrack(track)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playTrack(track);
              }
            }}
          >
            <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <Play className="text-white ml-1" size={24} />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <h1 className="text-2xl font-bold text-white">{track.title}</h1>
          <p className="text-gray-400">{track.artist}</p>
        </div>
      </div>
    </div>
  );
}
