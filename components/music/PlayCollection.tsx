'use client';
import { usePlayback, type Track } from '@/context/PlaybackContext';
import { isTrackAvailable } from '@/lib/tracks';
export default function PlayCollection({
  tracks,
  label = 'Play all',
}: {
  tracks: Track[];
  label?: string;
}) {
  const { playTracks } = usePlayback();
  const disabled = !tracks.some(isTrackAvailable);
  return (
    <div className="flex flex-wrap gap-3 py-4">
      <button
        className="rounded-full bg-brand px-5 py-2 text-white disabled:opacity-40"
        disabled={disabled}
        type="button"
        onClick={() => playTracks(tracks)}
      >
        {label}
      </button>
      <button
        className="rounded-full border border-border-dark px-5 py-2 disabled:opacity-40"
        disabled={disabled}
        type="button"
        onClick={() => playTracks(tracks, true)}
      >
        Shuffle
      </button>
    </div>
  );
}
