import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getArtistReleases,
  getRelease,
  isPublishedRelease,
  releaseTracks,
  type Release,
} from '@/lib/releases';
const release: Release = {
  id: 'ep',
  title: 'An EP',
  type: 'ep',
  artistId: 'artist',
  releaseDate: '2025-01-01',
  tracks: [
    { trackNumber: 2, song: { id: 'two', title: 'Second', status: 'ready', hlsMasterUrl: 'hls' } },
    { trackNumber: 1, song: { id: 'one', title: 'First', status: 'ready', hlsMasterUrl: 'hls' } },
  ],
};
afterEach(() => vi.unstubAllGlobals());
describe('releases', () => {
  it('orders tracks by trackNumber without changing backend data', () => {
    expect(releaseTracks(release).map((track) => track.id)).toEqual(['one', 'two']);
    expect(release.tracks[0].trackNumber).toBe(2);
  });
  it.each([
    { published: false },
    { status: 'draft' },
    { releaseDate: '2999-01-01' },
    { releaseDate: 'invalid' },
  ])('hides unpublished releases: %j', (changes) =>
    expect(isPublishedRelease({ ...release, ...changes })).toBe(false)
  );
  it('returns null for unknown and unpublished releases', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ status: 404 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { ...release, published: false } }),
        })
    );
    expect(await getRelease('missing')).toBeNull();
    expect(await getRelease('draft')).toBeNull();
  });
  it('loads all artist pages newest first', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [release], pagination: { totalPages: 2 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ ...release, id: 'new', releaseDate: '2026-01-01' }] }),
      });
    vi.stubGlobal('fetch', fetchMock);
    expect((await getArtistReleases('artist')).map((item) => item.id)).toEqual(['new', 'ep']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
