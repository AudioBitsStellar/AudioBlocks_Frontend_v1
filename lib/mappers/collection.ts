/**
 * Single mapping point between backend releases and the UI's "collection"
 * shapes (#560).
 *
 * Decision: a UI collection is a backend **release** of type `ep` or `album`
 * (`/api/releases`, the EP/album container with ordered tracks). Singles are
 * not collections. Backend `albums` (`/api/albums`) are not used yet: that
 * router only exposes a paginated list, with no per-id lookup and no ordered
 * tracks (see AudioBlock_Backend#740 / #742), so releases are the only source
 * that can back explore, per-artist and detail views today.
 */
import type { Release } from '@/lib/releases';

export interface Collection {
  id: string;
  title: string;
  artist: string;
  cover: string;
  trackCount: number;
  published: boolean;
  createdAt: string;
}

export interface CollectionMetadata {
  id: string;
  name: string;
  description: string;
  artwork: string;
  trackCount: number;
  totalPlays: number;
  owner: string;
}

/** On-chain NFT metadata JSON pinned to IPFS (fields we read; all optional). */
export interface IpfsCollectionMetadata {
  name?: string;
  description?: string;
  image?: string;
  artwork?: string;
  owner?: string;
  properties?: { totalPlays?: number };
}

/** A release that may carry a pinned metadata CID once the backend adds it. */
export type CollectionRelease = Release & {
  description?: string;
  metadataCid?: string | null;
  artistAddress?: string | null;
  createdAt?: string;
  totalPlays?: number;
};

const COLLECTION_TYPES: ReadonlySet<Release['type']> = new Set(['ep', 'album']);

export function isCollectionRelease(release: Pick<Release, 'type'>): boolean {
  return COLLECTION_TYPES.has(release.type);
}

function artistName(release: Release): string {
  return release.artist?.name || release.artist?.username || '';
}

function countTracks(release: Release): number {
  return (release.tracks ?? []).filter((t) => t.song !== null).length;
}

export function releaseToCollection(release: Release): Collection {
  return {
    id: release.id,
    title: release.title,
    artist: artistName(release),
    cover: release.coverArt ?? '',
    trackCount: countTracks(release),
    published: release.published !== false && (!release.status || release.status === 'published'),
    createdAt: (release as CollectionRelease).createdAt ?? release.releaseDate,
  };
}

/** Converts `ipfs://<cid>` image references to the gateway; passes http(s) through. */
function resolveImage(value: string | undefined, toGateway: (cid: string) => string | null): string {
  if (!value) return '';
  if (value.startsWith('ipfs://')) return toGateway(value.slice('ipfs://'.length)) ?? '';
  return value;
}

/**
 * Collection metadata from the release, overlaid with its pinned IPFS JSON
 * when present. Backend fields win only where IPFS is silent.
 */
export function releaseToCollectionMetadata(
  release: CollectionRelease,
  ipfs: IpfsCollectionMetadata | null,
  toGateway: (cid: string) => string | null,
): CollectionMetadata {
  return {
    id: release.id,
    name: ipfs?.name || release.title,
    description: ipfs?.description || release.description || '',
    artwork: resolveImage(ipfs?.image || ipfs?.artwork, toGateway) || release.coverArt || '',
    trackCount: countTracks(release),
    totalPlays: ipfs?.properties?.totalPlays ?? release.totalPlays ?? 0,
    owner: ipfs?.owner || release.artistAddress || release.artistId || '',
  };
}
