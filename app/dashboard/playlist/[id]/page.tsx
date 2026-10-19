'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import PlayCollection from '@/components/music/PlayCollection';
import TrackList from '@/components/music/TrackList';
import { useGetProfile } from '@/hooks/useProfile';
import { getPlaylist, playlistTracks, removePlaylistSong } from '@/lib/playlistService';
import { isTrackAvailable } from '@/lib/tracks';
export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => getPlaylist(id),
  });
  const { data: profile } = useGetProfile();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const tracks = data ? playlistTracks(data) : [];
  const unavailable = tracks.filter((track) => !isTrackAvailable(track));
  const removeUnavailable = async () => {
    setRemoving(true);
    setError('');
    try {
      const results = await Promise.allSettled(
        unavailable.map((track) => removePlaylistSong(id, track.id))
      );
      if (results.some((result) => result.status === 'rejected'))
        setError('Some songs could not be removed. Please try again.');
    } finally {
      await refetch();
      setRemoving(false);
    }
  };
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Link className="underline" href="/dashboard/playlist">
        Back to playlists
      </Link>
      {isLoading ? (
        <p role="status">Loading playlist…</p>
      ) : isError ? (
        <div role="alert">
          Unable to load playlist.{' '}
          <button className="underline" type="button" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold">{data?.name}</h1>
          <PlayCollection tracks={tracks} />
          {profile?.id === data?.userId && !data?.isRuleBased && unavailable.length > 0 && (
            <button
              className="rounded border border-border-dark px-4 py-2 disabled:opacity-40"
              disabled={removing}
              type="button"
              onClick={() => void removeUnavailable()}
            >
              {removing ? 'Removing…' : 'Remove unavailable songs'}
            </button>
          )}
          {error && <p role="alert">{error}</p>}
          {tracks.length ? <TrackList tracks={tracks} /> : <p>This playlist is empty.</p>}
        </>
      )}
    </div>
  );
}
