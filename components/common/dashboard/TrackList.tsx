'use client';

import { useCallback, useRef, type KeyboardEvent } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import AudioCard, { type AudioCardVariant } from '@/components/ui/AudioCard';
import { usePlayback, type Track } from '@/context/PlaybackContext';

export type TrackListItem = Track & { duration?: string; variant?: AudioCardVariant };

const estimatedHeights: Record<AudioCardVariant, number> = {
  compact: 80,
  standard: 320,
  wide: 180,
};

export default function TrackList({ tracks }: { tracks: TrackListItem[] }) {
  const { playTrack } = usePlayback();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    // Keyed by id so measured heights (and scroll offset) survive data refreshes.
    getItemKey: (index) => tracks[index].id,
    estimateSize: (index) => estimatedHeights[tracks[index].variant ?? 'compact'],
    overscan: 5,
  });

  // Rows outside the viewport aren't in the DOM, so arrow keys scroll first, then focus.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const row = (event.target as HTMLElement).closest<HTMLElement>('[data-index]');
      if (!row) return;
      event.preventDefault();
      const next = Number(row.dataset.index) + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0 || next >= tracks.length) return;
      virtualizer.scrollToIndex(next);
      requestAnimationFrame(() => {
        parentRef.current
          ?.querySelector<HTMLElement>(`[data-index="${next}"] [tabindex="0"]`)
          ?.focus();
      });
    },
    [tracks.length, virtualizer]
  );

  return (
    // Key events bubble up from the focusable AudioCards inside each row.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={parentRef}
      aria-label="Tracks"
      className="h-[400px] overflow-auto custom-scrollbar rounded-lg border border-border-dark"
      role="list"
      onKeyDown={handleKeyDown}
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
              aria-posinset={virtualItem.index + 1}
              aria-setsize={tracks.length}
              data-index={virtualItem.index}
              role="listitem"
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
                variant={track.variant ?? 'compact'}
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
