import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/apiClient', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { buildSongSearchUrl, searchSongs, SEARCH_PAGE_SIZE } from '@/lib/searchService';

const song = (id: number) => ({ id: String(id), title: `Song ${id}`, artist: 'Ada', streamUrl: `https://cdn/${id}.m3u8` });

describe('buildSongSearchUrl (#569)', () => {
  it('encodes q, page and limit, and adds genre only when given', () => {
    expect(buildSongSearchUrl({ q: ' love songs ', page: 2 })).toBe(`/api/song/search?q=love+songs&page=2&limit=${SEARCH_PAGE_SIZE}`);
    expect(buildSongSearchUrl({ q: 'love', genre: 'afrobeats' })).toContain('&genre=afrobeats');
    expect(buildSongSearchUrl({ q: 'love', genre: '  ' })).not.toContain('genre');
  });
});

describe('searchSongs (#569)', () => {
  beforeEach(() => get.mockReset());

  it('requests the search endpoint with the query and maps songs to tracks', async () => {
    get.mockResolvedValue({ data: { data: [song(1)], artists: [{ id: 'a1', name: 'Ada' }], hasMore: false } });
    const res = await searchSongs({ q: 'love', page: 1 });
    expect(get.mock.calls[0][0]).toBe(`/api/song/search?q=love&page=1&limit=${SEARCH_PAGE_SIZE}`);
    expect(res.songs.map((t) => t.title)).toEqual(['Song 1']);
    expect(res.artists).toEqual([{ id: 'a1', name: 'Ada', image: undefined }]);
    expect(res.nextPage).toBeNull();
  });

  it('derives the next page from nextPage, hasMore, total, or a full page', async () => {
    get.mockResolvedValueOnce({ data: { songs: [song(1)], nextPage: 3 } });
    expect((await searchSongs({ q: 'x', page: 2 })).nextPage).toBe(3);
    get.mockResolvedValueOnce({ data: { data: { songs: [song(1)], hasMore: true } } });
    expect((await searchSongs({ q: 'x', page: 1 })).nextPage).toBe(2);
    get.mockResolvedValueOnce({ data: { results: [song(1)], total: 25 } });
    expect((await searchSongs({ q: 'x', page: 2, limit: 10 })).nextPage).toBe(3);
    get.mockResolvedValueOnce({ data: { results: [song(1)], total: 20 } });
    expect((await searchSongs({ q: 'x', page: 2, limit: 10 })).nextPage).toBeNull();
    get.mockResolvedValueOnce({ data: Array.from({ length: 5 }, (_, i) => song(i)) });
    expect((await searchSongs({ q: 'x', page: 1, limit: 5 })).nextPage).toBe(2);
    get.mockResolvedValueOnce({ data: [song(1)] });
    expect((await searchSongs({ q: 'x', page: 1, limit: 5 })).nextPage).toBeNull();
  });

  it('returns empty results for an unexpected body', async () => {
    get.mockResolvedValue({ data: null });
    expect(await searchSongs({ q: 'x' })).toEqual({ songs: [], artists: [], nextPage: null });
  });
});
