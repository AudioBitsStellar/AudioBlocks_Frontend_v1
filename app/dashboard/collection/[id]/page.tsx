'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ArtworkImage } from '@/components/ui/ArtworkImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { useNFTCollection } from '@/hooks/useNFTCollection';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { IPFS_GATEWAY, ipfsUrl } from '@/lib/ipfs';
import { shortenId } from '@/lib/stellarExplorer';



export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useScrollRestoration(`collection-${id}`);
  const { songs, isLoading } = useNFTCollection();
  const [isDownloading, setIsDownloading] = useState(false);

  const song = useMemo(() => {
    if (isLoading) return undefined;
    return songs.find((s) => s.songCID === id || s.songId.toString() === id);
  }, [songs, id, isLoading]);

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
      <Link
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        href="/dashboard/collection"
      >
        <ArrowLeft size={16} />
        Back to Collections
      </Link>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="relative w-full md:w-80 h-80 rounded-xl overflow-hidden shrink-0">
          <ArtworkImage
            fill
            alt={`Cover art for ${shortenId(song.songCID, 8, 4)}`}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 320px"
            src={song.coverUrl ? ipfsUrl(song.coverUrl) : '/audio.jpg'}
            title={shortenId(song.songCID, 8, 4)}
          />
        </div>
        <div className="flex-1 space-y-4">
          <h1 className="text-2xl font-bold text-white">Collection Detail</h1>
          <p className="text-sm text-gray-400 break-all">
            <span className="text-gray-500">CID:</span> {song.songCID}
          </p>
          <p className="text-sm text-gray-400 break-all">
            <span className="text-gray-500">Artist:</span> {song.artistAddress}
          </p>
          {/* Issue #339: owning the NFT (this page only renders for songs in
              the connected wallet's collection) unlocks a direct download of
              the underlying audio, not just streaming. */}
<button
            type="button"
            disabled={isDownloading}
            onClick={async () => {
              setIsDownloading(true);
              try {
                // TODO: If the backend exposes an authenticated download endpoint for owned NFTs, prefer it here.
                const url = ipfsUrl(song.songCID);
                const response = await fetch(url);
                if (!response.ok) throw new Error('Failed to download audio file');

                const contentType = response.headers.get('content-type') || '';
                let ext = 'mp3';
                if (contentType.includes('audio/wav') || contentType.includes('wave')) ext = 'wav';
                else if (contentType.includes('audio/ogg')) ext = 'ogg';
                else if (contentType.includes('audio/flac')) ext = 'flac';
                else if (contentType.includes('audio/aac')) ext = 'aac';
                else if (contentType.includes('audio/mp4') || contentType.includes('m4a')) ext = 'm4a';

                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                const artistName = song.artistName && song.artistName !== song.artistAddress ? song.artistName : 'Artist';
                const title = song.title && song.title !== song.songCID ? song.title : song.songCID;
                a.download = `${artistName} - ${title}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
              } catch (err) {
                console.error(err);
                toast.error('Failed to download audio file. Please try again.');
              } finally {
                setIsDownloading(false);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand hover:bg-pink-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
            <Download aria-hidden="true" size={16} />
            )}
            {isDownloading ? 'Downloading…' : 'Download audio'}
          </button>
        </div>
      </div>
    </div>
  );
}
