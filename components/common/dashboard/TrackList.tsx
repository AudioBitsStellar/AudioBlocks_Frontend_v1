'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import AudioCard from '@/components/ui/AudioCard';
import { usePlayback } from '@/context/PlaybackContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TrackList({ tracks }: { tracks: any[] }) {
  const { playTrack } = usePlayback();
  const parentRef = useRef<HTMLDivElement>(null);

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
              <AudioCard
                artist={track.artist}
                artworkUrl={track.cover}
                className="border-b border-border-dark"
                duration={track.duration}
                title={track.title}
                variant="compact"
                onClick={() => playTrack(track)}
                onPlay={() => playTrack(track)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
