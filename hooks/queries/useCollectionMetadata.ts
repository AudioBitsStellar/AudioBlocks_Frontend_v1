'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/context/WalletContext';
import apiClient, { NotFoundError } from '@/lib/apiClient';
import { getIpfsUrl } from '@/lib/stellarExplorer';
import {
  isCollectionRelease,
  releaseToCollectionMetadata,
  type CollectionMetadata,
  type CollectionRelease,
  type IpfsCollectionMetadata,
} from '@/lib/mappers/collection';

export const COLLECTION_METADATA_STALE_TIME = 60 * 1000;

export const collectionMetadataKeys = {
  all: ['collection-metadata'] as const,
  detail: (id: string) => ['collection-metadata', id] as const,
};

export type { CollectionMetadata } from '@/lib/mappers/collection';

/** Fetches pinned NFT metadata JSON via the configured IPFS gateway; null on any failure. */
async function fetchIpfsMetadata(
  cid: string,
  signal?: AbortSignal
): Promise<IpfsCollectionMetadata | null> {
  const url = getIpfsUrl(cid);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    return (await res.json()) as IpfsCollectionMetadata;
  } catch {
    return null;
  }
}

/**
 * Collection metadata for an EP/album release (#560): the release from
 * `/api/releases/:id`, overlaid with its pinned IPFS metadata when the
 * release carries a `metadataCid`. Returns null when the release is missing
 * or the releases router is not mounted yet (AudioBlock_Backend#752).
 */
export async function fetchCollectionMetadata(
  id: string,
  signal?: AbortSignal
): Promise<CollectionMetadata | null> {
  let release: CollectionRelease | undefined;
  try {
    const res = await apiClient.get(`/api/releases/${encodeURIComponent(id)}`, { signal });
    release = (res.data as { data?: CollectionRelease } | null)?.data;
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
  if (!release || !isCollectionRelease(release)) return null;

  const ipfs = release.metadataCid ? await fetchIpfsMetadata(release.metadataCid, signal) : null;
  return releaseToCollectionMetadata(release, ipfs, getIpfsUrl);
}

/**
 * Fetches and caches on-chain collection metadata (name, description, artwork,
 * trackCount, totalPlays, owner). Cached for 60s; invalidated on wallet connect/disconnect.
 */
export function useCollectionMetadata(collectionId: string) {
  const queryClient = useQueryClient();
  const { isConnected, address } = useWallet();

  const query = useQuery({
    queryKey: collectionMetadataKeys.detail(collectionId),
    queryFn: ({ signal }) => fetchCollectionMetadata(collectionId, signal),
    staleTime: COLLECTION_METADATA_STALE_TIME,
    gcTime: COLLECTION_METADATA_STALE_TIME * 5,
    enabled: !!collectionId,
    retry: 1,
  });

  // Invalidate collection metadata cache when wallet connects or disconnects.
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: collectionMetadataKeys.all });
  }, [isConnected, address, queryClient]);

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isNotFound: !query.isLoading && !query.error && query.data === null && !!collectionId,
  };
}

export default useCollectionMetadata;
