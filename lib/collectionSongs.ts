import { shortenId } from './stellarExplorer';
import type { OwnedCollectionItem } from './ownedCollectionService';

/** An owned NFT song prepared for display in the collection page. */
export interface OwnedNFT {
  songId: bigint;
  artistAddress: string;
  songCID: string;
  totalStreams: bigint;
  totalLikes: bigint;
  /** Song title from the backend/indexer, or a shortened CID when it is missing. */
  title: string;
  /** Artist name from the backend/indexer, or a shortened address when it is missing. */
  artistName: string;
  /** Explicit artwork URL, if the backend supplied one. */
  coverUrl?: string;
  /** Whether `title` is a real title rather than the CID fallback. */
  hasTitle: boolean;
  /** Whether `artistName` is a real name rather than the address fallback. */
  hasArtistName: boolean;
}

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

/** Artwork URL for a song: its own cover when known, else the CID on the IPFS gateway. */
export function songCoverSrc(song: Pick<OwnedNFT, 'coverUrl' | 'songCID'>): string {
  if (song.coverUrl) return song.coverUrl;
  const cid = song.songCID;
  if (cid.startsWith('Qm') || cid.startsWith('baf')) return `${IPFS_GATEWAY}${cid}`;
  return '/audio.jpg';
}

const clean = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/** Maps one backend owned-NFT row to the shape the collection page renders. */
export function toOwnedNFT(item: OwnedCollectionItem): OwnedNFT {
  const title = clean(item.title);
  const artistName = clean(item.artistName);
  return {
    songId: BigInt(item.songId),
    artistAddress: item.artistAddress,
    songCID: item.songCID,
    totalStreams: BigInt(item.totalStreams ?? 0),
    totalLikes: BigInt(item.totalLikes ?? 0),
    title: title ?? shortenId(item.songCID, 8, 4),
    artistName: artistName ?? shortenId(item.artistAddress),
    coverUrl: clean(item.coverUrl),
    hasTitle: title !== undefined,
    hasArtistName: artistName !== undefined,
  };
}

/**
 * Filters songs by a search term. Matches the title and artist name first and
 * keeps the CID and artist address as a fallback. Case-insensitive; an empty
 * term matches everything.
 */
export function filterOwnedSongs(songs: OwnedNFT[], search: string): OwnedNFT[] {
  const term = search.trim().toLowerCase();
  if (!term) return songs;
  const has = (value: string | undefined) => !!value && value.toLowerCase().includes(term);
  return songs.filter(
    (s) =>
      (s.hasTitle && has(s.title)) ||
      (s.hasArtistName && has(s.artistName)) ||
      has(s.songCID) ||
      has(s.artistAddress)
  );
}
