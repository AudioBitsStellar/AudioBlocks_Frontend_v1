import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PLAYLIST_QUERY_KEYS, useToggleFollowPlaylist } from '@/hooks/usePlaylists';
import { followPlaylist, unfollowPlaylist } from '@/lib/playlistService';
import type { PlaylistSummary } from '@/lib/playlistService';
import { toast } from 'sonner';

vi.mock('@/lib/playlistService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/playlistService')>();
  return { ...actual, followPlaylist: vi.fn(), unfollowPlaylist: vi.fn() };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockFollow = vi.mocked(followPlaylist);
const mockUnfollow = vi.mocked(unfollowPlaylist);

const existing: PlaylistSummary = { id: 'p1', name: 'Mix', userId: 'u2' };
const candidate: PlaylistSummary = { id: 'p2', name: 'Night', userId: 'u3' };

function setup(followed: PlaylistSummary[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(PLAYLIST_QUERY_KEYS.followed, followed);
  // Stop the refetch that runs on settle from hitting the mocked service.
  vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useToggleFollowPlaylist(), { wrapper });
  return { client, ...hook };
}

describe('useToggleFollowPlaylist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds the playlist to the followed list before the request resolves', async () => {
    let resolveRequest: () => void = () => {};
    mockFollow.mockReturnValueOnce(new Promise<void>((resolve) => (resolveRequest = resolve)));
    const { client, result } = setup([existing]);

    act(() => {
      result.current.mutate({ playlist: candidate, follow: true });
    });

    await waitFor(() => {
      const ids = client.getQueryData<PlaylistSummary[]>(PLAYLIST_QUERY_KEYS.followed)?.map(
        (p) => p.id
      );
      expect(ids).toEqual(['p1', 'p2']);
    });
    expect(mockFollow).toHaveBeenCalledWith('p2');
    resolveRequest();
  });

  it('removes the playlist when unfollowing', async () => {
    mockUnfollow.mockResolvedValueOnce(undefined);
    const { client, result } = setup([existing, candidate]);

    act(() => {
      result.current.mutate({ playlist: existing, follow: false });
    });

    await waitFor(() => expect(mockUnfollow).toHaveBeenCalledWith('p1'));
    await waitFor(() => {
      const ids = client.getQueryData<PlaylistSummary[]>(PLAYLIST_QUERY_KEYS.followed)?.map(
        (p) => p.id
      );
      expect(ids).toEqual(['p2']);
    });
  });

  it('restores the previous followed list and shows an error when the request fails', async () => {
    mockFollow.mockRejectedValueOnce(new Error('network down'));
    const { client, result } = setup([existing]);

    act(() => {
      result.current.mutate({ playlist: candidate, follow: true });
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(client.getQueryData<PlaylistSummary[]>(PLAYLIST_QUERY_KEYS.followed)).toEqual([
      existing,
    ]);
  });
});
