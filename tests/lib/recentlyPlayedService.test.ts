import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '@/lib/apiClient';
import type { Track } from '@/context/PlaybackContext';
import {
  MAX_RECENTLY_PLAYED,
  clearRemoteRecentlyPlayed,
  getRemoteRecentlyPlayed,
  mergeRecentlyPlayed,
} from '@/lib/recentlyPlayedService';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), delete: vi.fn() },
}));

const mockGet = vi.mocked(apiClient.get);
const mockDelete = vi.mocked(apiClient.delete);

const track = (id: string): Track => ({ id, title: `Track ${id}`, artist: 'Artist', cover: '' });

describe('mergeRecentlyPlayed', () => {
  it('returns local history when the backend has none', () => {
    const local = [track('a'), track('b')];

    expect(mergeRecentlyPlayed(local, [])).toEqual(local);
  });

  it('returns backend history when there is no local history', () => {
    const remote = [track('x'), track('y')];

    expect(mergeRecentlyPlayed([], remote)).toEqual(remote);
  });

  it('prepends local plays newer than the backend latest track', () => {
    // Local is most recent first. "c" and "d" were played after the backend's latest "a".
    const local = [track('c'), track('d'), track('a'), track('b')];
    const remote = [track('a'), track('b')];

    expect(mergeRecentlyPlayed(local, remote).map((t) => t.id)).toEqual(['c', 'd', 'a', 'b']);
  });

  it('keeps every local play when the backend latest track is not in local history', () => {
    const local = [track('c'), track('d')];
    const remote = [track('z')];

    expect(mergeRecentlyPlayed(local, remote).map((t) => t.id)).toEqual(['c', 'd', 'z']);
  });

  it('removes duplicates, keeping the first occurrence', () => {
    const local = [track('b')];
    const remote = [track('a'), track('b')];

    expect(mergeRecentlyPlayed(local, remote).map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('caps the result at the history limit', () => {
    const remote = Array.from({ length: MAX_RECENTLY_PLAYED + 5 }, (_, i) => track(`r${i}`));

    expect(mergeRecentlyPlayed([], remote)).toHaveLength(MAX_RECENTLY_PLAYED);
  });
});

describe('recentlyPlayedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps backend tracks and drops entries without an id or title', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'a', title: 'Alpha', artistName: 'Luna', coverUrl: '/a.png' },
          { id: 7, title: 'Beta', artist: 'Sol', cover: '/b.png' },
          { title: 'No id' },
          { id: 'c' },
        ],
      },
      status: 200,
      headers: new Headers(),
    });

    const tracks = await getRemoteRecentlyPlayed();

    expect(mockGet).toHaveBeenCalledWith('/api/users/me/recently-played');
    expect(tracks).toEqual([
      { id: 'a', title: 'Alpha', artist: 'Luna', cover: '/a.png', url: undefined },
      { id: '7', title: 'Beta', artist: 'Sol', cover: '/b.png', url: undefined },
    ]);
  });

  it('returns an empty list when the response is not an array', async () => {
    mockGet.mockResolvedValueOnce({ data: { message: 'nope' }, status: 200, headers: new Headers() });

    await expect(getRemoteRecentlyPlayed()).resolves.toEqual([]);
  });

  it('deletes the listening history on the backend', async () => {
    mockDelete.mockResolvedValueOnce({ data: null, status: 200, headers: new Headers() });

    await clearRemoteRecentlyPlayed();

    expect(mockDelete).toHaveBeenCalledWith('/api/users/me/recently-played');
  });
});
