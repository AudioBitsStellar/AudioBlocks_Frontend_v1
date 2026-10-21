import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let params = new URLSearchParams('q=love');
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
  useRouter: () => ({ push }),
  usePathname: () => '/search',
}));
vi.mock('@dynamic-labs/sdk-react-core', () => ({ useDynamicContext: () => ({ user: null }) }));

const searchSongs = vi.fn();
vi.mock('@/lib/searchService', () => ({ searchSongs: (...a: unknown[]) => searchSongs(...a) }));

const playTrack = vi.fn();
vi.mock('@/context/PlaybackContext', () => ({ usePlayback: () => ({ playTrack }) }));

import { SearchResults, SEARCH_URL_DEBOUNCE_MS } from '@/components/search/SearchResults';

const track = { id: 's1', title: 'Love Song', artist: 'Ada', cover: '/c.jpg', available: true };

beforeEach(() => {
  params = new URLSearchParams('q=love');
  push.mockReset();
  searchSongs.mockReset();
  playTrack.mockReset();
  localStorage.clear();
});

describe('/search page (#569)', () => {
  it('sends ?q= (and genre) to the search request and renders results with play buttons', async () => {
    params = new URLSearchParams('q=love&genre=afrobeats');
    searchSongs.mockResolvedValue({ songs: [track], artists: [{ id: 'a1', name: 'Ada' }], nextPage: null });
    render(<SearchResults />);

    await waitFor(() => expect(screen.getByText('Love Song')).toBeInTheDocument());
    expect(searchSongs).toHaveBeenCalledWith(expect.objectContaining({ q: 'love', genre: 'afrobeats', page: 1 }));
    expect(screen.getByRole('heading', { name: 'Artists' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play Love Song' }));
    expect(playTrack).toHaveBeenCalledWith(track);
  });

  it('shows the empty state when the backend finds nothing', async () => {
    params = new URLSearchParams('q=zzzz');
    searchSongs.mockResolvedValue({ songs: [], artists: [], nextPage: null });
    render(<SearchResults />);
    await waitFor(() => expect(screen.getByText('No results for "zzzz".')).toBeInTheDocument());
  });

  it('does not search for an empty or too-short query', () => {
    params = new URLSearchParams('q=a');
    render(<SearchResults />);
    expect(screen.getByText(/Type at least 2 characters/)).toBeInTheDocument();
    expect(searchSongs).not.toHaveBeenCalled();
  });

  it('shows an error with retry when the request fails', async () => {
    searchSongs.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ songs: [track], artists: [], nextPage: null });
    render(<SearchResults />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Search failed'));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Love Song')).toBeInTheDocument());
  });

  it('pushes the typed query to the URL after the debounce', async () => {
    searchSongs.mockResolvedValue({ songs: [], artists: [], nextPage: null });
    vi.useFakeTimers();
    try {
      render(<SearchResults />);
      fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs and artists' }), { target: { value: 'love you' } });
      expect(push).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(SEARCH_URL_DEBOUNCE_MS);
      });
      expect(push).toHaveBeenCalledWith('/search?q=love+you', { scroll: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('restores the input from the URL on back/forward navigation', async () => {
    searchSongs.mockResolvedValue({ songs: [], artists: [], nextPage: null });
    const { rerender } = render(<SearchResults />);
    expect(screen.getByRole('searchbox')).toHaveValue('love');
    params = new URLSearchParams('q=jazz');
    rerender(<SearchResults />);
    await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue('jazz'));
    await waitFor(() => expect(searchSongs).toHaveBeenCalledWith(expect.objectContaining({ q: 'jazz' })));
  });

  it('saves a completed search to search history', async () => {
    searchSongs.mockResolvedValue({ songs: [track], artists: [], nextPage: null });
    render(<SearchResults />);
    await waitFor(() => expect(screen.getByText('Love Song')).toBeInTheDocument());
    await waitFor(() =>
      expect(localStorage.getItem('audioblocks_search_history') ?? '').toContain('"love"')
    );
  });
});
