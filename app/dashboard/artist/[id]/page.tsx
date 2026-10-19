'use client';

import { use, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { demoOr } from '@/lib/fixtures';
import { artistsData as demoArtistsData } from '@/lib/fixtures/dashboard';
import ArtistReleases from '@/components/releases/ArtistReleases';
import { Skeleton } from '@/components/ui/Skeleton';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { useNFTCollection } from '@/hooks/useNFTCollection';

const artistsData = demoOr(demoArtistsData, []);

export default function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { songs, isLoading } = useNFTCollection();

  const artistInfo = useMemo(() => {
    return artistsData.find((artist) => artist.id === parseInt(id));
  }, [id]);

  const artistSongs = useMemo(() => {
    if (isLoading) return undefined;
    return songs.filter((s) => s.artistAddress === id);
  }, [songs, id, isLoading]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  // Releases can exist before an artist has minted an on-chain song.
  if (!id) notFound();

  return (
    <div className="p-6">
      <Link
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        href="/dashboard/all-artists"
      >
        <ArrowLeft size={16} />
        Back to Artists
      </Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 break-all">
            {artistInfo?.song || `Artist: ${id}`}
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-400">{artistInfo?.description || 'Unknown'}</p>
            {artistInfo?.isVerified && <VerifiedBadge size="sm" />}
          </div>
        </div>
      </div>
      <ArtistReleases artistId={id} />
      <p className="text-sm text-gray-400 mb-4">{artistSongs?.length || 0} track(s)</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {artistSongs?.map((song, i) => (
          <div key={i} className="bg-surface-elevated rounded-lg overflow-hidden">
            <div className="relative aspect-square">
              <Image fill alt={song.songCID} className="object-cover" src="/audio.jpg" />
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
