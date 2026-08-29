'use client';

import { memo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import AudioCard from '@/components/ui/AudioCard';
import { usePlayback } from '@/context/PlaybackContext';

const TrackListRow = memo(function TrackListRow({
  track,
  onPlay,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  track: any;
  onPlay: () => void;
}) {
  return (
    <AudioCard
      artist={track.artist}
      artworkUrl={track.cover}
      className="border-b border-border-dark"
      duration={track.duration}
      title={track.title}
      variant="compact"
      onClick={onPlay}
      onPlay={onPlay}
    />
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TrackList({ tracks }: { tracks: any[] }) {
  const { playTrack } = usePlayback();
  const parentRef = useRef<HTMLDivElement>(null);

  // Stable per-track callback so a re-render of the list never cascades into
  // every visible row re-rendering (#161).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlay = useCallback((track: any) => playTrack(track), [playTrack]);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-[400px] overflow-auto custom-scrollbar rounded-lg border border-border-dark"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const track = tracks[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TrackListRow track={track} onPlay={() => handlePlay(track)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
