'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { NotFoundError } from '@/lib/apiClient';
import { useWallet } from '@/context/WalletContext';

export const COLLECTION_METADATA_STALE_TIME = 60 * 1000;

export const collectionMetadataKeys = {
  all: ['collection-metadata'] as const,
  detail: (id: string) => ['collection-metadata', id] as const,
};

export interface CollectionMetadata {
  id: string;
  name: string;
  description: string;
  artwork: string;
  trackCount: number;
  totalPlays: number;
  owner: string;
}

const mockMetadata: Record<string, CollectionMetadata> = {
  'col-1': {
    id: 'col-1',
    name: 'Afrobeats Essentials',
    description: 'A curated collection of essential afrobeats tracks.',
    artwork: '/AFRO.jpg',
    trackCount: 12,
    totalPlays: 48210,
    owner: '0xabc123',
  },
  'col-2': {
    id: 'col-2',
    name: 'Chill Vibes',
    description: 'Laid-back instrumentals and soft grooves.',
    artwork: '/tech.jpg',
    trackCount: 8,
    totalPlays: 19340,
    owner: '0xdef456',
  },
};

function normalizeMetadata(id: string, data: Partial<CollectionMetadata>): CollectionMetadata {
  return {
    id: data.id ?? id,
    name: data.name ?? '',
    description: data.description ?? '',
    artwork: data.artwork ?? '',
    trackCount: data.trackCount ?? 0,
    totalPlays: data.totalPlays ?? 0,
    owner: data.owner ?? '',
  };
}

export async function fetchCollectionMetadata(
  id: string,
  signal?: AbortSignal,
): Promise<CollectionMetadata | null> {
  try {
    const res = await apiClient.get(`/api/collections/${id}/metadata`, { signal });
    const data = res.data as CollectionMetadata | null;
    if (!data) return null;
    return normalizeMetadata(id, data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return null;
    }
    // Dev/offline fallback for known mock collections so UI can still render.
    if (id in mockMetadata) {
      return mockMetadata[id];
    }
    // Graceful fallback when collection is missing or the endpoint is unreachable.
    return null;
  }
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
