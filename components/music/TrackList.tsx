'use client';
import { Play, Plus } from 'lucide-react';
import { usePlayback, type Track } from '@/context/PlaybackContext';
import { isTrackAvailable, UNAVAILABLE_REASON } from '@/lib/tracks';

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return '—';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
export default function TrackList({ tracks }: { tracks: Track[] }) {
  const { playTrack, addToQueue } = usePlayback();
  return (
    <ol aria-label="Tracks" className="divide-y divide-border-dark">
      {tracks.map((track, index) => {
        const available = isTrackAvailable(track);
        return (
          <li
            key={`${track.id}-${index}`}
            className={`flex items-center gap-3 py-3 ${available ? '' : 'text-on-muted'}`}
          >
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
          </li>
        );
      })}
    </ol>
  );
}
