'use client';
import { useReadContract, useReadContracts } from 'wagmi';
import { useAccount } from 'wagmi';
import { abi, contractAddress } from '@/config/abi';

export interface OwnedSong {
  songId: bigint;
  artistAddress: string;
  songCID: string;
  totalStreams: bigint;
  totalLikes: bigint;
  createdAt: bigint;
}

export function useNFTCollection() {
  const { address, isConnected } = useAccount();

  const { data: nftBalance, isLoading: balanceLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: songIds, isLoading: songIdsLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getArtistSongs',
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const ids = (songIds as bigint[] | undefined) ?? [];

  const { data: songResults, isLoading: songsLoading } = useReadContracts({
    contracts: ids.map((id) => ({
      address: contractAddress as `0x${string}`,
      abi,
      functionName: 'getSongById',
      args: [id],
    })),
    query: { enabled: ids.length > 0 },
  });

  const songs: OwnedSong[] = (songResults ?? [])
    .map((r) => r.result as OwnedSong | undefined)
    .filter(Boolean) as OwnedSong[];

  return {
    isConnected,
    address,
    nftBalance: (nftBalance as bigint | undefined) ?? 0n,
    songs,
    isLoading: balanceLoading || songIdsLoading || songsLoading,
  };
}
