'use client';

import { memo, useCallback, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import AudioCard from '@/components/ui/AudioCard';
import { usePlaybackActions } from '@/context/PlaybackContext';
import type { Track } from '@/context/PlaybackContext';
import { useRecentlyPlayed } from '@/hooks/useRecentlyPlayed';

export type RecentlyPlayedVariant = 'home' | 'dashboard';

const RecentlyPlayedCard = memo(function RecentlyPlayedCard({
  track,
  variant,
}: {
  track: Track;
  variant: RecentlyPlayedVariant;
}) {
  const { playTrack } = usePlaybackActions();
  const handlePlay = useCallback(() => playTrack(track), [playTrack, track]);

  return (
    <AudioCard
      artist={track.artist}
      artworkUrl={track.cover}
      className={
        variant === 'home'
          ? 'w-40 flex-shrink-0 snap-start bg-surface-elevated'
          : 'bg-surface-elevated'
      }
      title={track.title}
      variant="standard"
      onClick={handlePlay}
      onPlay={handlePlay}
    />
  );
});

/**
 * Recently played tracks. `home` is a horizontal strip with a clear-history control.
 * `dashboard` is a grid without clearing.
 */
export function RecentlyPlayed({ variant = 'home' }: { variant?: RecentlyPlayedVariant }) {
  const { recentlyPlayed, clearHistory } = useRecentlyPlayed();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  if (recentlyPlayed.length === 0) return null;

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await clearHistory();
      setShowConfirm(false);
      toast.success('Listening history cleared');
    } catch {
      toast.error('Could not clear your listening history. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const header = (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-white">Recently Played</h2>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">{recentlyPlayed.length} tracks</span>
        {variant === 'home' &&
          (showConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Clear all?</span>
              <button
                className="text-xs text-red-400 hover:text-red-300 underline disabled:opacity-50"
                disabled={isClearing}
                onClick={handleClear}
              >
                Yes
              </button>
              <button
                aria-label="Cancel clearing history"
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
          ))}
      </div>
    </div>
  );

  if (variant === 'dashboard') {
    return (
      <div className="mb-8">
        {header}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {recentlyPlayed.map((track) => (
            <RecentlyPlayedCard key={track.id} track={track} variant={variant} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="mb-8">
      {header}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {recentlyPlayed.map((track) => (
          <RecentlyPlayedCard key={track.id} track={track} variant={variant} />
        ))}
      </div>
    </section>
  );
}

export default RecentlyPlayed;
