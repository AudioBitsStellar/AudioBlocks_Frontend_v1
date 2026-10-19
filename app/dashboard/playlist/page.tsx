'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import type { SavedPlaylist } from '@/lib/playlistService';
export default function PlaylistsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['playlists', page],
    queryFn: async () => {
      const response = await apiClient.get(`/api/playlists?page=${page}`);
      return response.data as { data: SavedPlaylist[]; pagination: { totalPages: number } };
    },
  });
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-3xl font-bold">My playlists</h1>
      {isLoading ? (
        <p role="status">Loading playlists…</p>
      ) : isError ? (
        <div role="alert">
          Unable to load playlists.{' '}
          <button className="underline" type="button" onClick={() => void refetch()}>
            Retry
          </button>
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
