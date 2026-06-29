'use client';

import { usePlayback } from '@/context/PlaybackContext';
import Image from 'next/image';
import { Play } from 'lucide-react';

export default function RecentlyPlayed() {
  const { recentlyPlayed, playTrack } = usePlayback();

  if (recentlyPlayed.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Recently Played</h2>
        <span className="text-xs text-gray-400">{recentlyPlayed.length} tracks</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {recentlyPlayed.map((track) => (
          <div
            key={track.id}
            className="group relative bg-surface-elevated rounded-lg overflow-hidden cursor-pointer hover:bg-surface-hover transition"
            onClick={() => playTrack(track)}
          >
            <div className="relative aspect-square">
              <Image
                src={track.cover || '/placeholder-cover.svg'}
                alt={track.title}
                fill
                className="object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-cover.svg';
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center">
                  <Play size={20} className="text-white ml-1" />
                </div>
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium text-white truncate">{track.title}</h3>
              <p className="text-xs text-gray-400 truncate">{track.artist}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
