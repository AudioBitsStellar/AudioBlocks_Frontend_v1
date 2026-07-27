'use client';

import { notFound } from 'next/navigation';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useNFTCollection } from '@/hooks/useNFTCollection';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

function ipfsImage(cid: string): string {
  if (cid.startsWith('Qm') || cid.startsWith('baf')) return `${IPFS_GATEWAY}${cid}`;
  return '/audio.jpg';
}

export default function CollectionDetailPage({ params }: { params: { id: string } }) {
  useScrollRestoration(`collection-${params.id}`);
  const { songs, isLoading } = useNFTCollection();

  const song = useMemo(() => {
    if (isLoading) return undefined;
    return songs.find((s) => s.songCID === params.id || s.id === params.id);
  }, [songs, params.id, isLoading]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!song) notFound();

  return (
    <div className="p-6">
      <Link href="/dashboard/collection" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to Collections
      </Link>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="relative w-full md:w-80 h-80 rounded-xl overflow-hidden shrink-0">
          <Image src={ipfsImage(song.songCID)} alt={song.songCID} fill className="object-cover" />
        </div>
        <div className="flex-1 space-y-4">
          <h1 className="text-2xl font-bold text-white">Collection Detail</h1>
          <p className="text-sm text-gray-400 break-all">
            <span className="text-gray-500">CID:</span> {song.songCID}
          </p>
          <p className="text-sm text-gray-400 break-all">
            <span className="text-gray-500">Artist:</span> {song.artistAddress}
          </p>
        </div>
      </div>
    </div>
  );
}
