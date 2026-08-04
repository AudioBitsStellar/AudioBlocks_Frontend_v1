import { useQuery } from '@tanstack/react-query';
import { useReadContract, useReadContracts } from 'wagmi';
import { abi, contractAddress } from '@/config/abi';
import { QUERY_KEYS, CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';
import { getMerchListings, getEventListings } from '@/lib/exploreService';

export function useGetMerch() {
  return useQuery({
    queryKey: QUERY_KEYS.EXPLORE_MERCH,
    queryFn: getMerchListings,
    staleTime: CACHE_DURATIONS.MEDIUM,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

export function useGetEvents() {
  return useQuery({
    queryKey: QUERY_KEYS.EXPLORE_EVENTS,
    queryFn: getEventListings,
    staleTime: CACHE_DURATIONS.MEDIUM,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

export function useGetChainArtists() {
  const { data: ids, isLoading: idsLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getAllArtirstIds',
  });

  const artistIds = (ids as bigint[] | undefined) ?? [];

  const { data: artistResults, isLoading: artistsLoading } = useReadContracts({
    contracts: artistIds.map((id) => ({
      address: contractAddress as `0x${string}`,
      abi,
      functionName: 'getArtistById',
      args: [id],
    })),
    query: { enabled: artistIds.length > 0 },
  });

  const artists = (artistResults ?? [])
    .map(
      (r) =>
        r.result as
          | { artistId: bigint; artistAddress: string; artistCid: string; balance: bigint }
          | undefined
    )
    .filter(Boolean) as {
    artistId: bigint;
    artistAddress: string;
    artistCid: string;
    balance: bigint;
  }[];

  return { artists, isLoading: idsLoading || artistsLoading };
}

export function useGetChainCollections() {
  const { data: ids, isLoading: idsLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getAllAlbums',
  });

  const albumIds = (ids as bigint[] | undefined) ?? [];

  const { data: albumResults, isLoading: albumsLoading } = useReadContracts({
    contracts: albumIds.map((id) => ({
      address: contractAddress as `0x${string}`,
      abi,
      functionName: 'getAlbumById',
      args: [id],
    })),
    query: { enabled: albumIds.length > 0 },
  });

  const albums = (albumResults ?? [])
    .map(
      (r) =>
        r.result as
          | {
              albumId: bigint;
              albumCID: string;
              artistAddress: string;
              songIds: bigint[];
              published: boolean;
              createdAt: bigint;
              publishedAt: bigint;
            }
          | undefined
    )
    .filter(Boolean) as {
    albumId: bigint;
    albumCID: string;
    artistAddress: string;
    songIds: bigint[];
    published: boolean;
    createdAt: bigint;
    publishedAt: bigint;
  }[];

  return { albums, isLoading: idsLoading || albumsLoading };
}
