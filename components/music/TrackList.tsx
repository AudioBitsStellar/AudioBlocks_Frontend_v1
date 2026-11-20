'use client';
import { useState } from 'react';
import { Flag, Play, Plus } from 'lucide-react';
import { ReportDialog } from '@/components/common/ReportDialog';
import { usePlayback, type Track } from '@/context/PlaybackContext';
import { useOptionalUserPreferences } from '@/context/UserPreferencesContext';
import {
  EXPLICIT_HIDDEN_REASON,
  isTrackAvailable,
  isTrackHiddenByExplicitFilter,
  UNAVAILABLE_REASON,
} from '@/lib/tracks';

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return '—';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
export default function TrackList({ tracks }: { tracks: Track[] }) {
  const { playTrack, addToQueue } = usePlayback();
  const allowExplicit = useOptionalUserPreferences()?.preferences.showExplicitContent ?? false;
  const [reportTrack, setReportTrack] = useState<Track | null>(null);

  return (
    <>
      <ol aria-label="Tracks" className="divide-y divide-border-dark">
        {tracks.map((track, index) => {
          const explicitHidden = isTrackHiddenByExplicitFilter(track, allowExplicit);
          const available = isTrackAvailable(track) && !explicitHidden;
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
                <p className="truncate font-medium">
                  {track.title}
                  {track.explicit && (
                    <span
                      aria-label="Explicit content"
                      className="ml-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-gray-600 align-middle text-[10px] font-bold leading-none text-white"
                      title="Explicit"
                    >
                      E
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-on-muted">{track.artist}</p>
                {!available && (
                  <span
                    aria-describedby={`unavailable-${index}`}
                    className="text-sm"
                    tabIndex={0}
                    title={explicitHidden ? EXPLICIT_HIDDEN_REASON : UNAVAILABLE_REASON}
                  >
                    {explicitHidden ? 'Hidden' : 'Unavailable'}
                    <span className="sr-only" id={`unavailable-${index}`}>
                      : {explicitHidden ? EXPLICIT_HIDDEN_REASON : UNAVAILABLE_REASON}
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
              <button
                aria-label={`Report ${track.title}`}
                className="rounded p-2 text-on-muted hover:text-white"
                title="Report this track"
                type="button"
                onClick={() => setReportTrack(track)}
              >
                <Flag aria-hidden="true" size={16} />
              </button>
            </li>
          );
        })}
      </ol>
      {reportTrack && (
        <ReportDialog
          open
          target={{ kind: 'song', id: reportTrack.id }}
          onClose={() => setReportTrack(null)}
        />
      )}
    </>
  );
}
