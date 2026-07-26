'use client';

import { notFound } from 'next/navigation';
import { usePlayback } from '@/context/PlaybackContext';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';

export default function PlaylistDetailPage({ params }: { params: { id: string } }) {
  const { playlist, playTrack } = usePlayback();

  const track = playlist.find((t) => t.id === params.id);

  if (!track) notFound();

  return (
    <div className="p-6">
      <Link href="/dashboard/playlist" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to Playlist
      </Link>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="relative w-full md:w-64 h-64 rounded-xl overflow-hidden shrink-0 bg-surface-elevated">
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer group"
            onClick={() => playTrack(track)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playTrack(track); } }}
            aria-label={`Play ${track.title}`}
          >
            <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <Play size={24} className="text-white ml-1" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <h1 className="text-2xl font-bold text-white">{track.title}</h1>
          <p className="text-gray-400">{track.artist}</p>
        </div>
      </div>
    </div>
  );
}
