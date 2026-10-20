import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient, { NotFoundError } from '@/lib/apiClient';
import { fetchSongLyrics } from '@/lib/lyricsService';

vi.mock('@/lib/apiClient', () => {
  class MockNotFoundError extends Error {}
  return { default: { get: vi.fn() }, NotFoundError: MockNotFoundError };
});

describe('fetchSongLyrics (#583)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads lyrics from the success envelope', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { lyrics: 'La la la' } },
      status: 200,
      headers: new Headers(),
    });

    await expect(fetchSongLyrics('song-1')).resolves.toBe('La la la');
    expect(apiClient.get).toHaveBeenCalledWith('/api/song/song-1/lyrics');
  });

  it('resolves to null when the backend has no lyrics to show', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { lyrics: '   ' } },
      status: 200,
      headers: new Headers(),
    });

    await expect(fetchSongLyrics('song-1')).resolves.toBeNull();
  });

  it('treats a 404 as no lyrics', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new NotFoundError());

    await expect(fetchSongLyrics('song-1')).resolves.toBeNull();
  });

  it('rethrows other failures so the panel can show its error state', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('HTTP error! status: 500'));

    await expect(fetchSongLyrics('song-1')).rejects.toThrow('status: 500');
  });
});
