'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Play, Search } from 'lucide-react';
import { useInfiniteQuery, type PageParam } from '@/hooks/useInfiniteQuery';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { usePlayback } from '@/context/PlaybackContext';
import type { Track } from '@/context/PlaybackContext';
import { searchSongs, type SearchArtist } from '@/lib/searchService';

/** Debounce before the typed query is pushed to the URL (and so fetched). */
export const SEARCH_URL_DEBOUNCE_MS = 400;
/** Shortest query that triggers a search. */
export const MIN_QUERY_LENGTH = 2;

/**
 * Full search results page (#569). The URL is the source of truth: `?q=`
 * (and optional `genre`) drive the request, typing updates the URL after a
 * short debounce, and back/forward restore earlier queries.
 */
export function SearchResults() {
  const { user } = useDynamicContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const genre = searchParams.get('genre');
  const [input, setInput] = useState(urlQuery);
  const lastPushed = useRef(urlQuery);
  const { addSearch } = useSearchHistory(user?.userId);
  const { playTrack } = usePlayback();

  // Back/forward (or a shared link) changed the URL: reflect it in the input.
  useEffect(() => {
    if (urlQuery !== lastPushed.current) {
      lastPushed.current = urlQuery;
      setInput(urlQuery);
    }
  }, [urlQuery]);

  // Debounced input -> URL. push (not replace) so each settled query is a
  // history entry that the back button can return to.
  useEffect(() => {
    const next = input.trim();
    if (next === urlQuery.trim()) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set('q', next);
      else params.delete('q');
      lastPushed.current = next;
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    }, SEARCH_URL_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, urlQuery, pathname, router, searchParams]);

  const q = urlQuery.trim();
  const enabled = q.length >= MIN_QUERY_LENGTH;
  const [artists, setArtists] = useState<SearchArtist[]>([]);

  const fetcher = useCallback(
    async (cursor: PageParam, signal: AbortSignal) => {
      const page = typeof cursor === 'number' ? cursor : 1;
      const res = await searchSongs({ q, genre, page, signal });
      if (page === 1) setArtists(res.artists);
      return { data: res.songs, nextCursor: res.nextPage };
    },
    [q, genre],
  );

  const { data: songs, isLoading, isLoadingMore, hasNextPage, error, fetchNextPage, refetch } =
    useInfiniteQuery<Track>({ key: ['song-search', q, genre], fetcher, initialCursor: 1, enabled });

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: enabled && hasNextPage,
    isLoading: isLoading || isLoadingMore,
    enabled,
  });

  // Save each query that actually ran to search history, once.
  const savedQuery = useRef<string | null>(null);
  useEffect(() => {
    if (enabled && !isLoading && !error && savedQuery.current !== q) {
      savedQuery.current = q;
      addSearch(q);
    }
  }, [enabled, isLoading, error, q, addSearch]);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 text-white">
      <h1 className="mb-4 text-2xl font-semibold">Search</h1>
      <div className="relative mb-6">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          aria-label="Search songs and artists"
          placeholder="Search songs and artists"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 pl-9 pr-3 text-sm focus:border-white focus:outline-none"
        />
      </div>
      {genre && <p className="mb-4 text-sm text-gray-400">Genre: {genre}</p>}

      {!enabled ? (
        <p className="text-gray-400">Type at least {MIN_QUERY_LENGTH} characters to search.</p>
      ) : isLoading ? (
        <div role="status" className="flex items-center gap-2 text-gray-400">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Searching for &quot;{q}&quot;…
        </div>
      ) : error && songs.length === 0 ? (
        <div role="alert" className="space-y-3">
          <p className="text-red-400">Search failed. Please try again.</p>
          <button type="button" onClick={() => void refetch()} className="rounded-md border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-800">
            Retry
          </button>
        </div>
      ) : songs.length === 0 && artists.length === 0 ? (
        <p className="text-gray-400">No results for &quot;{q}&quot;.</p>
      ) : (
        <div className="space-y-8">
          {artists.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Artists</h2>
              <ul className="flex flex-wrap gap-4">
                {artists.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm">
                    {a.image && <img src={a.image} alt="" className="h-8 w-8 rounded-full object-cover" />}
                    {a.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {songs.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Songs</h2>
              <ul className="divide-y divide-gray-800">
                {songs.map((track) => (
                  <li key={track.id} className="flex items-center gap-3 py-2">
                    <img src={track.cover} alt="" className="h-10 w-10 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{track.title}</p>
                      <p className="truncate text-sm text-gray-400">{track.artist}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Play ${track.title}`}
                      disabled={track.available === false}
                      onClick={() => playTrack(track)}
                      className="rounded-full p-2 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Play aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && songs.length > 0 && (
            <p role="alert" className="text-sm text-red-400">
              Couldn&apos;t load more results.{' '}
              <button type="button" className="underline" onClick={() => void fetchNextPage()}>
                Try again
              </button>
            </p>
          )}
          {isLoadingMore && (
            <div role="status" className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading more…
            </div>
          )}
          <div ref={sentinelRef} aria-hidden="true" />
        </div>
      )}
    </section>
  );
}
