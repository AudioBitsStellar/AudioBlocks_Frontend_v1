'use client';

import { memo, useCallback, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import AudioCard from '@/components/ui/AudioCard';
import { usePlayback } from '@/context/PlaybackContext';
import { useRecentlyPlayed } from '@/hooks/useRecentlyPlayed';
import type { Track } from '@/context/PlaybackContext';

const RecentlyPlayedCard = memo(function RecentlyPlayedCard({ track }: { track: Track }) {
  const { playTrack } = usePlayback();
  const handlePlay = useCallback(() => playTrack(track), [playTrack, track]);

  return (
    <AudioCard
      artist={track.artist}
      artworkUrl={track.cover}
      className="w-40 flex-shrink-0 snap-start bg-surface-elevated"
      title={track.title}
      variant="standard"
      onClick={handlePlay}
      onPlay={handlePlay}
    />
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
