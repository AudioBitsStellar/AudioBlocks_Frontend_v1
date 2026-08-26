'use client';
import { useReadContract, useReadContracts } from 'wagmi';
import { abi, contractAddress } from '@/config/abi';

export function useContractSong(songId: bigint | undefined) {
  const { data, isLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getSongById',
    args: songId !== undefined ? [songId] : undefined,
    query: { enabled: songId !== undefined },
  });

  return {
    song: data as
      | { songId: bigint; artistAddress: string; songCID: string; totalStreams: bigint; totalLikes: bigint; createdAt: bigint }
      | undefined,
    isLoading,
  };
}

export function useContractAlbum(albumId: bigint | undefined) {
  const { data, isLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getAlbumById',
    args: albumId !== undefined ? [albumId] : undefined,
    query: { enabled: albumId !== undefined },
  });

  return {
    album: data as
      | { albumId: bigint; albumCID: string; artistAddress: string; songIds: bigint[]; published: boolean; createdAt: bigint; publishedAt: bigint }
      | undefined,
    isLoading,
  };
}

export function useContractArtist(artistId: bigint | undefined) {
  const { data, isLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'getArtistById',
    args: artistId !== undefined ? [artistId] : undefined,
    query: { enabled: artistId !== undefined },
  });

  return {
    artist: data as
      | { artistId: bigint; artistAddress: string; artistCid: string; balance: bigint }
      | undefined,
    isLoading,
  };
}
