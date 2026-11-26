'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Play, Shuffle } from 'lucide-react';
import { FollowPlaylistButton } from '@/components/playlist/FollowPlaylistButton';
import { usePlayback, type Track } from '@/context/PlaybackContext';
import { useGetProfile } from '@/hooks/useProfile';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import { usePlaylist } from '@/hooks/usePlaylists';
import type { PlaylistSummary } from '@/lib/playlistService';

export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const playlistQuery = usePlaylist(id);
  const { playlist: inMemoryQueue } = usePlayback();

  if (playlistQuery.isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-48 w-full bg-neutral-800 rounded-xl" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-neutral-800/60 rounded-lg w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (playlistQuery.data) {
    return <SavedPlaylistDetail playlist={playlistQuery.data} />;
  }

  // Check if it exists as an in-memory queued track
  const inMemoryTrack = inMemoryQueue.find((t) => t.id === id);
  if (inMemoryTrack) {
    return <QueuedTrackDetail track={inMemoryTrack} />;
  }

  // If 404 from API or not found anywhere, trigger 404 boundary
  notFound();
}

/** A playlist stored on the backend, with track list and playback controls. */
function SavedPlaylistDetail({ playlist }: { playlist: PlaylistSummary }) {
  const signedIn = useHasAuthSession();
  const { playTrack, playlist: currentQueue, currentIndex, isPlaying, toggleShuffle } = usePlayback();
  const songs = (playlist.songs as Track[]) || [];
  const songCount = songs.length;

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playTrack(songs[0]);
    }
  };

  const handleShufflePlay = () => {
    if (songs.length > 0) {
      toggleShuffle();
      const randomIdx = Math.floor(Math.random() * songs.length);
      playTrack(songs[randomIdx]);
    }
  };

  return (
    <div className="p-6 font-inter">
      <Link
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        href="/dashboard/playlist"
      >
        <ArrowLeft size={16} />
        Back to Playlists
      </Link>

      <div className="bg-gradient-to-r from-[#6E0596] to-[#580577] p-8 rounded-xl text-white flex flex-col md:flex-row items-center gap-6 mb-8 shadow-xl">
        <div className="relative w-36 h-36 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/10">
          <Image
            src="/AFRO.jpg"
            alt={playlist.name}
            fill
            unoptimized
            className="object-cover"
          />
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-white/70">Playlist</span>
            {playlist.isRuleBased && (
              <span className="rounded-full border border-pink-400/60 px-2 py-0.5 text-[11px] text-pink-200">
                Smart playlist
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold my-2">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-sm text-white/80 max-w-xl mb-3">{playlist.description}</p>
          )}
          <div className="text-xs text-white/70 flex items-center justify-center md:justify-start gap-3">
            <span>{songCount} {songCount === 1 ? 'Song' : 'Songs'}</span>
            {signedIn && <PlaylistFollowAction playlist={playlist} />}
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePlayAll}
            disabled={songs.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D2045B] hover:bg-[#b80348] text-white font-semibold text-sm transition shadow-lg disabled:opacity-50"
          >
            <Play size={16} className="fill-white" />
            Play All
          </button>
          <button
            type="button"
            onClick={handleShufflePlay}
            disabled={songs.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition border border-white/20 shadow-lg disabled:opacity-50"
          >
            <Shuffle size={16} />
            Shuffle
          </button>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          This playlist has no songs yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {songs.map((track, i) => {
            const globalIndex = currentQueue.findIndex((t) => t.url === track.url || t.id === track.id);
            const isActive = globalIndex >= 0 && globalIndex === currentIndex && isPlaying;

            return (
              <div
                key={track.id || i}
                className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                  isActive ? 'bg-surface border border-border-dark' : 'hover:bg-surface-hover'
                }`}
                onClick={() => playTrack(track)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand shrink-0">
                  <Play size={14} className="text-white ml-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isActive ? 'text-brand' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-on-muted truncate">{track.artist}</p>
                </div>
                <span className="text-xs text-on-muted shrink-0">{i + 1}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Looks up ownership so the follow button is hidden on the signed-in user's own playlists. */
function PlaylistFollowAction({ playlist }: { playlist: PlaylistSummary }) {
  const profile = useGetProfile();
  if (!profile.data) return null;

  return (
    <FollowPlaylistButton isOwner={profile.data.id === playlist.userId} playlist={playlist} />
  );
}

/** Fallback view for a queued track id. */
function QueuedTrackDetail({ track }: { track: Track }) {
  const { playTrack, isPlaying } = usePlayback();

  return (
    <div className="p-6">
      <Link
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        href="/dashboard/playlist"
      >
        <ArrowLeft size={16} />
        Back to Playlists
      </Link>
      <div className="flex flex-col md:flex-row gap-8 items-center">
        <div className="relative w-48 h-48 rounded-xl overflow-hidden shrink-0 bg-neutral-800">
          <Image
            src={track.cover || '/AFRO.jpg'}
            alt={track.title}
            fill
            unoptimized
            className="object-cover"
          />
        </div>
        <div className="space-y-3 text-center md:text-left">
          <h1 className="text-3xl font-bold text-white">{track.title}</h1>
          <p className="text-gray-400">{track.artist}</p>
          <button
            type="button"
            onClick={() => playTrack(track)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#D2045B] hover:bg-[#b80348] text-white font-semibold transition shadow-lg"
          >
            <Play size={18} className="fill-white" />
            {isPlaying ? 'Playing Now' : 'Play Track'}
          </button>
        </div>
      </div>
    </div>
  );
}
