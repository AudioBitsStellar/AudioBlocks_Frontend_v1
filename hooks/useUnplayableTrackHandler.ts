import { useCallback, useRef } from 'react';
import { usePlayback } from '@/context/PlaybackContext';

/**
 * Hook to handle unplayable tracks by automatically skipping them
 * and notifying the user (#627).
 *
 * Tracks playback errors, skips unplayable tracks, and provides feedback.
 */
export const useUnplayableTrackHandler = () => {
  const { setError, next, currentTrack, playlist } = usePlayback();
  const skippedTracksRef = useRef<Set<string>>(new Set());

  const handlePlayError = useCallback(
    (error: any) => {
      if (!currentTrack) return;

      const trackId = currentTrack.id;
      const errorMessage = error?.message || 'Unknown error';

      // Prevent infinite loop on the same track
      if (skippedTracksRef.current.has(trackId)) {
        setError(
          `Track "${currentTrack.title}" cannot be played. Skipping all attempts for this track.`
        );
        return;
      }

      skippedTracksRef.current.add(trackId);

      // Set error message for user notification
      setError(
        `Cannot play "${currentTrack.title}" by ${currentTrack.artist}. Skipping to next track...`
      );

      // Auto-skip to next track after a short delay
      setTimeout(() => {
        next();
      }, 2000);
    },
    [currentTrack, setError, next]
  );

  const resetSkippedTracks = useCallback(() => {
    skippedTracksRef.current.clear();
  }, []);

  return {
    handlePlayError,
    resetSkippedTracks,
  };
};
