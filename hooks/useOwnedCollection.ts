'use client';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { RETRY_CONFIG } from '@/lib/constants';
import { getOwnedCollection, OwnedCollectionItem } from '@/lib/ownedCollectionService';

export function useOwnedCollection() {
  const { address, isConnected } = useAccount();
  const enabled = isConnected && !!address;

  return useQuery<OwnedCollectionItem[]>({
    queryKey: ['owned-collection', address],
    queryFn: () => getOwnedCollection(address as string),
    enabled,
    staleTime: 0,
    retry: RETRY_CONFIG.DEFAULT,
  });
}
