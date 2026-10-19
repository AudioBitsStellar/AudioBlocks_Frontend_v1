import { describe, expect, it } from 'vitest';
import { filterOwnedSongs, songCoverSrc, toOwnedNFT } from '@/lib/collectionSongs';
import type { OwnedCollectionItem } from '@/lib/ownedCollectionService';

const CID = 'QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng';
const ADDRESS = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW';

const item = (over: Partial<OwnedCollectionItem> = {}): OwnedCollectionItem => ({
  songId: 1,
  songCID: CID,
  artistAddress: ADDRESS,
  totalStreams: 5,
  totalLikes: 2,
  createdAt: 0,
  ...over,
});

describe('toOwnedNFT', () => {
  it('uses the title, artist name and cover supplied by the backend', () => {
    const nft = toOwnedNFT(
      item({ title: 'Midnight Run', artistName: 'Ada', coverUrl: 'https://cdn.example/a.jpg' })
    );

    expect(nft).toMatchObject({
      title: 'Midnight Run',
      artistName: 'Ada',
      coverUrl: 'https://cdn.example/a.jpg',
      hasTitle: true,
      hasArtistName: true,
    });
    expect(songCoverSrc(nft)).toBe('https://cdn.example/a.jpg');
  });

  it('falls back to a shortened CID and address only when metadata is missing', () => {
    for (const missing of [undefined, null, '', '   ']) {
      const nft = toOwnedNFT(item({ title: missing, artistName: missing }));

      expect(nft.title).toBe('QmVLwvmG…zdng');
      expect(nft.artistName).toBe('GABCDE…TUVW');
      expect(nft.hasTitle).toBe(false);
      expect(nft.hasArtistName).toBe(false);
    }
  });

  it('derives the cover from the CID when no cover is given', () => {
    expect(songCoverSrc(toOwnedNFT(item()))).toBe(`https://ipfs.io/ipfs/${CID}`);
    expect(songCoverSrc(toOwnedNFT(item({ songCID: 'not-a-cid' })))).toBe('/audio.jpg');
  });

  it('keeps bigint counters', () => {
    expect(toOwnedNFT(item({ songId: 7 }))).toMatchObject({
      songId: 7n,
      totalStreams: 5n,
      totalLikes: 2n,
    });
  });
});

describe('filterOwnedSongs', () => {
  const songs = [
    toOwnedNFT(item({ songId: 1, title: 'Midnight Run', artistName: 'Ada Lovelace' })),
    toOwnedNFT(
      item({ songId: 2, songCID: 'QmOtherCid1234567890', title: 'Sunrise', artistName: 'Grace' })
    ),
    toOwnedNFT(item({ songId: 3, songCID: 'QmUntitled0000000000', artistAddress: 'GXYZ' })),
  ];
  const ids = (list: typeof songs) => list.map((s) => Number(s.songId));

  it('finds a song by its title, case-insensitively', () => {
    expect(ids(filterOwnedSongs(songs, 'midnight'))).toEqual([1]);
    expect(ids(filterOwnedSongs(songs, 'SUNRISE'))).toEqual([2]);
  });

  it('finds songs by artist name', () => {
    expect(ids(filterOwnedSongs(songs, 'lovelace'))).toEqual([1]);
  });

  it('still matches CID and address as a fallback', () => {
    expect(ids(filterOwnedSongs(songs, 'qmother'))).toEqual([2]);
    expect(ids(filterOwnedSongs(songs, 'gxyz'))).toEqual([3]);
  });

  it('does not match the shortened placeholder text of an untitled song', () => {
    expect(filterOwnedSongs(songs, '…')).toEqual([]);
  });

  it('returns everything for an empty or whitespace term', () => {
    expect(filterOwnedSongs(songs, '')).toHaveLength(3);
    expect(filterOwnedSongs(songs, '   ')).toHaveLength(3);
  });
});
