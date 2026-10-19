import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlaylistDetailPage from '@/app/dashboard/playlist/[id]/page';
import { PlaybackProvider } from '@/context/PlaybackContext';
import { useGetProfile } from '@/hooks/useProfile';
import { getPlaylist, removePlaylistSong } from '@/lib/playlistService';
vi.mock('@/hooks/useProfile', () => ({ useGetProfile: vi.fn() }));
vi.mock('@/lib/playlistService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/playlistService')>()),
  getPlaylist: vi.fn(),
  removePlaylistSong: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useGetProfile).mockReturnValue({ data: { id: 'owner' } } as ReturnType<
    typeof useGetProfile
  >);
  vi.mocked(getPlaylist).mockResolvedValue({
    id: 'list',
    userId: 'owner',
    name: 'My playlist',
    songs: [
      { position: 0, songId: 'gone', song: null },
      {
        position: 1,
        songId: 'ready',
        song: { id: 'ready', title: 'Available song', status: 'ready', hlsMasterUrl: 'hls' },
      },
    ],
  });
  vi.mocked(removePlaylistSong).mockResolvedValue(undefined);
});
async function mount() {
  await act(async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <PlaybackProvider>
          <Suspense fallback="Loading">
            <PlaylistDetailPage params={Promise.resolve({ id: 'list' })} />
          </Suspense>
        </PlaybackProvider>
      </QueryClientProvider>
    );
  });
}
describe('remove unavailable songs', () => {
  it('allows the owner to remove unavailable songs in one click and preserves available songs', async () => {
    await mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove unavailable songs' }));
    await waitFor(() => expect(removePlaylistSong).toHaveBeenCalledWith('list', 'gone'));
    expect(removePlaylistSong).toHaveBeenCalledTimes(1);
  });
  it('hides the bulk removal action from other listeners', async () => {
    vi.mocked(useGetProfile).mockReturnValue({ data: { id: 'viewer' } } as ReturnType<
      typeof useGetProfile
    >);
    await mount();
    await screen.findByRole('heading', { name: 'My playlist' });
    expect(
      screen.queryByRole('button', { name: 'Remove unavailable songs' })
    ).not.toBeInTheDocument();
  });
});
