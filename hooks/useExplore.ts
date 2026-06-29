import { useQuery } from '@tanstack/react-query';
import { getMerchListings, getEventListings } from '@/lib/exploreService';
import { useReadContract, useReadContracts } from 'wagmi';
import { abi, contractAddress } from '@/config/abi';

export function useGetMerch() {
  return useQuery({
    queryKey: ['explore-merch'],
    queryFn: getMerchListings,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useGetEvents() {
  return useQuery({
    queryKey: ['explore-events'],
    queryFn: getEventListings,
    staleTime: 1000 * 60 * 5,
    retry: 1,
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
    .map((r) => r.result as { artistId: bigint; artistAddress: string; artistCid: string; balance: bigint } | undefined)
    .filter(Boolean) as { artistId: bigint; artistAddress: string; artistCid: string; balance: bigint }[];

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
    .map((r) => r.result as { albumId: bigint; albumCID: string; artistAddress: string; songIds: bigint[]; published: boolean; createdAt: bigint; publishedAt: bigint } | undefined)
    .filter(Boolean) as { albumId: bigint; albumCID: string; artistAddress: string; songIds: bigint[]; published: boolean; createdAt: bigint; publishedAt: bigint }[];

  return { albums, isLoading: idsLoading || albumsLoading };
}
