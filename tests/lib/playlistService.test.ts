import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '@/lib/apiClient';
import {
  followPlaylist,
  getPlaylist,
  listFollowedPlaylists,
  unfollowPlaylist,
} from '@/lib/playlistService';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockDelete = vi.mocked(apiClient.delete);

const response = (data: unknown) => ({ data, status: 200, headers: new Headers() });

describe('playlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unwraps the { success, data } playlist envelope', async () => {
    mockGet.mockResolvedValueOnce(response({ success: true, data: { id: 'p1', name: 'Mix' } }));

    await expect(getPlaylist('p1')).resolves.toEqual({ id: 'p1', name: 'Mix' });
    expect(mockGet).toHaveBeenCalledWith('/api/playlists/p1');
  });

  it('returns the playlist from each followed entry', async () => {
    mockGet.mockResolvedValueOnce(
      response({
        success: true,
        data: [
          { playlist: { id: 'p1', name: 'Mix', userId: 'u2' }, followedAt: '2026-01-01' },
          { playlist: { id: 'p2', name: 'Night', userId: 'u3' }, followedAt: '2026-01-02' },
        ],
      })
    );

    const playlists = await listFollowedPlaylists();

    expect(mockGet).toHaveBeenCalledWith('/api/playlists/followed');
    expect(playlists.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('posts follow and deletes unfollow on the mounted playlist route', async () => {
    mockPost.mockResolvedValueOnce(response({ success: true }));
    mockDelete.mockResolvedValueOnce(response({ success: true }));

    await followPlaylist('p1');
    await unfollowPlaylist('p1');

    expect(mockPost).toHaveBeenCalledWith('/api/playlists/p1/follow');
    expect(mockDelete).toHaveBeenCalledWith('/api/playlists/p1/follow');
  });
});
