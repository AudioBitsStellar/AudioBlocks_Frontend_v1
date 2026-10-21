import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchArtists, useArtists } from '@/hooks/queries/artists';
import { fetchCollections, useCollections } from '@/hooks/queries/collections';

const mockGet = vi.fn();
vi.mock('@/lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/apiClient')>('@/lib/apiClient');
  return {
    ...actual,
    default: {
      get: (...args: unknown[]) => mockGet(...args),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('paginated catalog queries', () => {
  beforeEach(() => mockGet.mockReset());

  it('requests the selected artist page and uses the backend total', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 'artist-1', name: 'Artist One', profileImage: '/artist.jpg' }],
        pagination: { page: 2, limit: 12, total: 25, totalPages: 3 },
      },
    });

    const result = await fetchArtists(2, 12);

    expect(mockGet).toHaveBeenCalledWith('/api/artist?page=2&limit=12');
    expect(result).toMatchObject({ total: 25, items: [{ id: 'artist-1' }] });
  });

  it('refetches artists when the page changes', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { success: true, data: [{ id: 'artist-1' }], pagination: { total: 24 } },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: [{ id: 'artist-2' }], pagination: { total: 24 } },
      });

    const { rerender, result } = renderHook(({ page }) => useArtists(page), {
      initialProps: { page: 1 },
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data?.items[0].id).toBe('artist-1'));
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.data?.items[0].id).toBe('artist-2'));
    expect(mockGet).toHaveBeenLastCalledWith('/api/artist?page=2&limit=12');
  });

  it('requests paginated releases filtered to collections and maps the total', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 'release-1',
            title: 'Collection One',
            type: 'album',
            artistId: 'artist-1',
            artist: { name: 'Artist One' },
            coverArt: '/cover.jpg',
            releaseDate: '2020-01-01T00:00:00.000Z',
            tracks: [],
          },
        ],
        pagination: { page: 3, limit: 12, total: 30, totalPages: 3 },
      },
    });

    const result = await fetchCollections(3, 12);

    expect(mockGet).toHaveBeenCalledWith('/api/releases?type=ep,album&page=3&limit=12');
    expect(result).toMatchObject({
      total: 30,
      items: [{ id: 'release-1', title: 'Collection One', artist: 'Artist One' }],
    });
  });

  it('refetches collections when the page changes', async () => {
    const makeCollectionResponse = (id: string) => ({
      data: {
        success: true,
        data: [
          {
            id,
            title: 'Collection',
            type: 'album',
            artistId: 'artist-1',
            artist: { name: 'Artist One' },
            releaseDate: '2020-01-01T00:00:00.000Z',
            tracks: [],
          },
        ],
        pagination: { total: 24 },
      },
    });
    mockGet
      .mockResolvedValueOnce(makeCollectionResponse('release-1'))
      .mockResolvedValueOnce(makeCollectionResponse('release-2'));

    const { rerender, result } = renderHook(({ page }) => useCollections(page), {
      initialProps: { page: 1 },
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data?.items[0].id).toBe('release-1'));
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.data?.items[0].id).toBe('release-2'));
    expect(mockGet).toHaveBeenLastCalledWith('/api/releases?type=ep,album&page=2&limit=12');
  });
});
