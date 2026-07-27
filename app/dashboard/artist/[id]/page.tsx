'use client';

import { notFound } from 'next/navigation';
import { useNFTCollection } from '@/hooks/useNFTCollection';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

export default function ArtistDetailPage({ params }: { params: { id: string } }) {
  const { songs, isLoading } = useNFTCollection();

  const artistSongs = useMemo(() => {
    if (isLoading) return undefined;
    return songs.filter((s) => s.artistAddress === params.id);
  }, [songs, params.id, isLoading]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!artistSongs || artistSongs.length === 0) notFound();

  return (
    <div className="p-6">
      <Link href="/dashboard/all-artists" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to Artists
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6 break-all">Artist: {params.id}</h1>
      <p className="text-sm text-gray-400 mb-4">{artistSongs.length} track(s)</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {artistSongs.map((song, i) => (
          <div key={i} className="bg-surface-elevated rounded-lg overflow-hidden">
            <div className="relative aspect-square">
              <Image src="/audio.jpg" alt={song.songCID} fill className="object-cover" />
            </div>
            <div className="p-3">
              <p className="text-sm text-white truncate">{song.songCID}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
