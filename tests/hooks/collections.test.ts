import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import apiClient, { NotFoundError } from '@/lib/apiClient';
import {
  fetchCollectionDetail,
  fetchExploreCollections,
  fetchUserCollections,
} from '@/hooks/queries/collections';
import { fetchCollectionMetadata } from '@/hooks/queries/useCollectionMetadata';

vi.mock('@/lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/apiClient')>('@/lib/apiClient');
  return { ...actual, default: { get: vi.fn() } };
});

const get = vi.mocked(apiClient.get);
const ok = (data: unknown) => ({ data, status: 200, headers: new Headers() }) as never;

const rel = (id: string, type: 'single' | 'ep' | 'album', releaseDate = '2026-01-01T00:00:00.000Z', extra = {}) => ({
  id,
  title: `Release ${id}`,
  type,
  artistId: 'artist-1',
  artist: { name: 'Ade' },
  coverArt: `/${id}.jpg`,
  releaseDate,
  published: true,
  tracks: [{ trackNumber: 1, song: { id: `${id}-s1`, title: 'T' } }],
  ...extra,
});

beforeEach(() => {
  get.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('collection queries (#560)', () => {
  it('explore lists published EP/album releases newest first, excluding singles and future releases', async () => {
    get.mockResolvedValue(
      ok({
        data: [
          rel('a', 'album', '2026-01-01T00:00:00.000Z'),
          rel('s', 'single'),
          rel('e', 'ep', '2026-03-01T00:00:00.000Z'),
          rel('f', 'album', '2999-01-01T00:00:00.000Z'),
        ],
      })
    );
    const result = await fetchExploreCollections();
    expect(get).toHaveBeenCalledWith('/api/releases?limit=50&page=1');
    expect(result.map((c) => c.id)).toEqual(['e', 'a']);
  });

  it('returns an empty list when the releases endpoint is not mounted (404)', async () => {
    get.mockRejectedValue(new NotFoundError());
    await expect(fetchExploreCollections()).resolves.toEqual([]);
    await expect(fetchUserCollections('artist-1')).resolves.toEqual([]);
  });

  it('propagates non-404 errors', async () => {
    get.mockRejectedValue(new Error('network down'));
    await expect(fetchExploreCollections()).rejects.toThrow('network down');
  });

  it('user collections follow pagination for the artist', async () => {
    get
      .mockResolvedValueOnce(ok({ data: [rel('a', 'album')], pagination: { totalPages: 2 } }))
      .mockResolvedValueOnce(ok({ data: [rel('b', 'ep', '2026-02-01T00:00:00.000Z')], pagination: { totalPages: 2 } }));
    const result = await fetchUserCollections('artist 1');
    expect(get).toHaveBeenNthCalledWith(1, '/api/releases?artistId=artist%201&limit=100&page=1');
    expect(get).toHaveBeenNthCalledWith(2, '/api/releases?artistId=artist%201&limit=100&page=2');
    expect(result.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('detail maps a release and rejects singles with NotFoundError', async () => {
    get.mockResolvedValueOnce(ok({ data: rel('a', 'album') }));
    await expect(fetchCollectionDetail('a')).resolves.toMatchObject({ id: 'a', title: 'Release a', trackCount: 1 });
    expect(get).toHaveBeenCalledWith('/api/releases/a');

    get.mockResolvedValueOnce(ok({ data: rel('s', 'single') }));
    await expect(fetchCollectionDetail('s')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('collection metadata (#560)', () => {
  it('returns null for a missing release instead of mock data', async () => {
    get.mockRejectedValue(new NotFoundError());
    await expect(fetchCollectionMetadata('col-1')).resolves.toBeNull();
  });

  it('builds metadata from the release when there is no metadataCid', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    get.mockResolvedValue(ok({ data: rel('a', 'album') }));
    const meta = await fetchCollectionMetadata('a');
    expect(meta).toMatchObject({ id: 'a', name: 'Release a', artwork: '/a.jpg', trackCount: 1 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches pinned metadata from the IPFS gateway when the release has a metadataCid', async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({ name: 'On-chain name', image: 'ipfs://bafyart1234' }) }));
    vi.stubGlobal('fetch', fetchSpy);
    get.mockResolvedValue(ok({ data: rel('a', 'album', undefined, { metadataCid: 'bafymetacid123' }) }));
    const meta = await fetchCollectionMetadata('a');
    expect(fetchSpy).toHaveBeenCalledWith('https://ipfs.io/ipfs/bafymetacid123', expect.anything());
    expect(meta?.name).toBe('On-chain name');
    expect(meta?.artwork).toBe('https://ipfs.io/ipfs/bafyart1234');
  });

  it('falls back to release data when the IPFS gateway fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('gateway timeout'); }));
    get.mockResolvedValue(ok({ data: rel('a', 'album', undefined, { metadataCid: 'bafymetacid123' }) }));
    await expect(fetchCollectionMetadata('a')).resolves.toMatchObject({ name: 'Release a' });
  });
});
