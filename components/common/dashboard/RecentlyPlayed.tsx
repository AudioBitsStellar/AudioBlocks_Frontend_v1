'use client';

import { memo, useCallback } from 'react';
import AudioCard from '@/components/ui/AudioCard';
import { usePlayback } from '@/context/PlaybackContext';
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
          <RecentlyPlayedCard key={track.id} playTrack={playTrack} track={track} />
        ))}
      </div>
    </div>
  );
});

type CardProps = { track: Track; playTrack: (track: Track) => void };

const RecentlyPlayedCard = memo(function RecentlyPlayedCard({ track, playTrack }: CardProps) {
  const handlePlay = useCallback(() => playTrack(track), [playTrack, track]);

  return (
    <AudioCard
      artist={track.artist}
      artworkUrl={track.cover}
      className="bg-surface-elevated"
      title={track.title}
      variant="standard"
      onClick={handlePlay}
      onPlay={handlePlay}
    />
  );
});

export default RecentlyPlayed;
