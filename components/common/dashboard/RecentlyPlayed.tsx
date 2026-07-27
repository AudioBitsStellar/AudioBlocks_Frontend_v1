'use client';

import { memo, useCallback } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { Track } from '@/context/PlaybackContext';

const RecentlyPlayed = memo(function RecentlyPlayed() {
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
          <RecentlyPlayedCard key={track.id} track={track} playTrack={playTrack} />
        ))}
      </div>
    </div>
  );
});

type CardProps = { track: Track; playTrack: (track: Track) => void };

const RecentlyPlayedCard = memo(function RecentlyPlayedCard({ track, playTrack }: CardProps) {
  const handleClick = useCallback(() => playTrack(track), [playTrack, track]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playTrack(track);
    }
  }, [playTrack, track]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Play ${track.title} by ${track.artist}`}
      className="group relative bg-surface-elevated rounded-lg overflow-hidden cursor-pointer hover:bg-surface-hover transition"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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
  );
});

export default RecentlyPlayed;
