import { describe, it, expect } from 'vitest';
import {
  isCollectionRelease,
  releaseToCollection,
  releaseToCollectionMetadata,
  type CollectionRelease,
} from '@/lib/mappers/collection';

const gateway = (cid: string) => `https://ipfs.io/ipfs/${cid}`;

const release = (overrides: Partial<CollectionRelease> = {}): CollectionRelease => ({
  id: 'rel-1',
  title: 'Lagos Nights',
  type: 'album',
  artistId: 'artist-1',
  artist: { name: 'Ade', username: 'ade' },
  coverArt: 'https://cdn.example/cover.jpg',
  releaseDate: '2026-01-10T00:00:00.000Z',
  published: true,
  status: 'published',
  tracks: [
    { trackNumber: 1, song: { id: 's1', title: 'One' } },
    { trackNumber: 2, song: { id: 's2', title: 'Two' } },
    { trackNumber: 3, song: null }, // deleted song: not counted
  ],
  ...overrides,
});

describe('collection mapper (#560)', () => {
  it('treats EP and album releases as collections, not singles', () => {
    expect(isCollectionRelease({ type: 'album' })).toBe(true);
    expect(isCollectionRelease({ type: 'ep' })).toBe(true);
    expect(isCollectionRelease({ type: 'single' })).toBe(false);
  });

  it('maps a release to a Collection', () => {
    expect(releaseToCollection(release())).toEqual({
      id: 'rel-1',
      title: 'Lagos Nights',
      artist: 'Ade',
      cover: 'https://cdn.example/cover.jpg',
      trackCount: 2,
      published: true,
      createdAt: '2026-01-10T00:00:00.000Z',
    });
  });

  it('falls back to username, empty cover and draft status sensibly', () => {
    const c = releaseToCollection(
      release({ artist: { username: 'ade' }, coverArt: undefined, status: 'draft', createdAt: '2025-12-01T00:00:00.000Z' })
    );
    expect(c.artist).toBe('ade');
    expect(c.cover).toBe('');
    expect(c.published).toBe(false);
    expect(c.createdAt).toBe('2025-12-01T00:00:00.000Z');
  });

  it('builds metadata from the release when there is no IPFS document', () => {
    expect(releaseToCollectionMetadata(release({ description: 'Late-night grooves' }), null, gateway)).toEqual({
      id: 'rel-1',
      name: 'Lagos Nights',
      description: 'Late-night grooves',
      artwork: 'https://cdn.example/cover.jpg',
      trackCount: 2,
      totalPlays: 0,
      owner: 'artist-1',
    });
  });

  it('prefers pinned IPFS metadata and resolves ipfs:// artwork through the gateway', () => {
    const meta = releaseToCollectionMetadata(
      release({ artistAddress: 'GARTIST' }),
      {
        name: 'Lagos Nights (On-chain)',
        description: 'Pinned description',
        image: 'ipfs://bafyimagecid123',
        properties: { totalPlays: 4821 },
      },
      gateway
    );
    expect(meta.name).toBe('Lagos Nights (On-chain)');
    expect(meta.description).toBe('Pinned description');
    expect(meta.artwork).toBe('https://ipfs.io/ipfs/bafyimagecid123');
    expect(meta.totalPlays).toBe(4821);
    expect(meta.owner).toBe('GARTIST');
  });
});
