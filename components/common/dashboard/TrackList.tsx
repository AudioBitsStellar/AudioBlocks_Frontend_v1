'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Image from 'next/image';
import { Play } from 'lucide-react';
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
              className="flex items-center gap-4 p-3 hover:bg-surface-hover cursor-pointer transition border-b border-border-dark"
              onClick={() => playTrack(track)}
            >
              <div className="w-12 h-12 relative rounded overflow-hidden shrink-0">
                <Image
                  src={track.cover || '/placeholder-cover.svg'}
                  alt={track.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-cover.svg';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                  <Play size={16} className="text-white ml-1" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">{track.title}</h3>
                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
