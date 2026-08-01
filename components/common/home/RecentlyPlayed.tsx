'use client';

import { memo, useCallback, useRef, useState } from 'react';
import { Play, Trash2, X } from 'lucide-react';
import { ArtworkImage } from '@/components/ui/ArtworkImage';
import { usePlayback } from '@/context/PlaybackContext';
import { useRecentlyPlayed } from '@/hooks/useRecentlyPlayed';
import type { Track } from '@/context/PlaybackContext';

const RecentlyPlayedCard = memo(function RecentlyPlayedCard({ track }: { track: Track }) {
  const { playTrack } = usePlayback();

  const handleClick = useCallback(() => playTrack(track), [playTrack, track]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        playTrack(track);
      }
    },
    [playTrack, track]
  );

  return (
    <button
      aria-label={`Play ${track.title} by ${track.artist}`}
      className="group relative flex-shrink-0 w-40 snap-start bg-surface-elevated rounded-lg overflow-hidden cursor-pointer hover:bg-surface-hover transition text-left"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="relative aspect-square">
        <ArtworkImage
          fill
          alt={`${track.title} by ${track.artist}`}
          className="object-cover"
          src={track.cover}
          title={track.title}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center">
            <Play className="text-white ml-0.5" size={18} />
          </div>
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-medium text-white truncate">{track.title}</h3>
        <p className="text-xs text-gray-400 truncate">{track.artist}</p>
      </div>
    </button>
  );
});

export function RecentlyPlayed() {
  const { recentlyPlayed, clearAll } = useRecentlyPlayed();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (recentlyPlayed.length === 0) return null;

  const handleClear = () => {
    clearAll();
    setShowConfirm(false);
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Recently Played</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{recentlyPlayed.length} tracks</span>
          {showConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Clear all?</span>
              <button
                className="text-xs text-red-400 hover:text-red-300 underline"
                onClick={handleClear}
              >
                Yes
              </button>
              <button
                className="text-xs text-gray-400 hover:text-white"
                onClick={() => setShowConfirm(false)}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              aria-label="Clear recently played"
              className="text-gray-400 hover:text-white transition"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {recentlyPlayed.map((track) => (
          <RecentlyPlayedCard key={track.id} track={track} />
        ))}
      </div>
    </section>
  );
}
