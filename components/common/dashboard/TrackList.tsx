'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import AudioCard from '@/components/ui/AudioCard';
import { usePlayback } from '@/context/PlaybackContext';

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
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <AudioCard
                className="border-b border-border-dark"
                variant="compact"
                artworkUrl={track.cover}
                title={track.title}
                artist={track.artist}
                duration={track.duration}
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
