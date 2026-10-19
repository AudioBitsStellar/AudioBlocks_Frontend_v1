'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PlayCollection from '@/components/music/PlayCollection';
import TrackList from '@/components/music/TrackList';
import apiClient from '@/lib/apiClient';
import { songToTrack, type SongResponse } from '@/lib/tracks';
export default function LibraryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['library', page],
    queryFn: async () => {
      const response = await apiClient.get(`/api/users/me/library?page=${page}`);
      return response.data as {
        saves: { saveId: string; song: SongResponse | null }[];
        totalPages: number;
      };
    },
  });
  const tracks = data?.saves.map((save) => songToTrack(save.song, save.saveId)) ?? [];
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-3xl font-bold">Library</h1>
      {isLoading ? (
        <p role="status">Loading saved songs…</p>
      ) : isError ? (
        <div role="alert">
          Unable to load your library.{' '}
          <button className="underline" type="button" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <PlayCollection tracks={tracks} />
          {tracks.length ? <TrackList tracks={tracks} /> : <p>No saved songs yet.</p>}
        </>
      )}
      <nav aria-label="Library pages" className="flex gap-4">
        <button disabled={page === 1} type="button" onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={!data || page >= data.totalPages}
          type="button"
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
