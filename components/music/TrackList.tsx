'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Play, Plus } from 'lucide-react';
import { usePlayback, type Track } from '@/context/PlaybackContext';
import { isTrackAvailable, UNAVAILABLE_REASON } from '@/lib/tracks';

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return '—';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

const VIRTUALIZATION_THRESHOLD = 20;
const ESTIMATED_ROW_HEIGHT = 58;

interface TrackListProps {
  tracks: Track[];
  virtualizeThreshold?: number;
  maxHeight?: number | string;
}

export default function TrackList({
  tracks,
  virtualizeThreshold = VIRTUALIZATION_THRESHOLD,
  maxHeight = 600,
}: TrackListProps) {
  const { playTrack, addToQueue } = usePlayback();
  const parentRef = useRef<HTMLDivElement>(null);

  const shouldVirtualize = tracks.length > virtualizeThreshold;

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 5,
    enabled: shouldVirtualize,
  });

  const renderTrackRow = (track: Track, index: number, isVirtual = false) => {
    const available = isTrackAvailable(track);
    return (
      <>
        <span className="w-6 shrink-0 text-sm text-on-muted">{index + 1}</span>
        <button
          aria-label={`Play ${track.title}`}
          className="rounded-full p-2 disabled:opacity-40"
          disabled={!available}
          type="button"
          onClick={() => playTrack(track)}
        >
          <Play aria-hidden="true" size={18} />
        </button>
        <div className={`min-w-0 flex-1 ${available ? '' : 'opacity-60'}`}>
          <p className="truncate font-medium">{track.title}</p>
          <p className="truncate text-sm text-on-muted">{track.artist}</p>
          {!available && (
            <span
              aria-describedby={`unavailable-${index}`}
              className="text-sm"
              tabIndex={0}
              title={UNAVAILABLE_REASON}
            >
              Unavailable
              <span className="sr-only" id={`unavailable-${index}`}>
                : {UNAVAILABLE_REASON}
              </span>
            </span>
          )}
        </div>
        <span className="text-sm text-on-muted">{formatDuration(track.duration)}</span>
        <button
          aria-label={`Queue ${track.title}`}
          className="rounded p-2 disabled:opacity-40"
          disabled={!available}
          type="button"
          onClick={() => addToQueue(track)}
        >
          <Plus aria-hidden="true" size={18} />
        </button>
      </>
    );
  };

  if (!shouldVirtualize) {
    return (
      <ol aria-label="Tracks" className="divide-y divide-border-dark">
        {tracks.map((track, index) => {
          const available = isTrackAvailable(track);
          return (
            <li
              key={`${track.id}-${index}`}
              className={`flex items-center gap-3 py-3 ${available ? '' : 'text-on-muted'}`}
            >
              {renderTrackRow(track, index)}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-auto custom-scrollbar rounded-lg"
      data-testid="virtualized-tracklist-container"
      style={{
        maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
      }}
    >
      <ol
        aria-label="Tracks"
        className="relative divide-y divide-border-dark"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const index = virtualItem.index;
          const track = tracks[index];
          const available = isTrackAvailable(track);
          return (
            <li
              key={virtualItem.key}
              ref={virtualizer.measureElement}
              aria-posinset={index + 1}
              aria-setsize={tracks.length}
              className={`absolute left-0 top-0 w-full flex items-center gap-3 py-3 border-b border-border-dark bg-black/40 ${
                available ? '' : 'text-on-muted'
              }`}
              data-index={index}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderTrackRow(track, index, true)}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
