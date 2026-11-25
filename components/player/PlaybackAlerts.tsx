'use client';

import { AlertCircle, X } from 'lucide-react';

interface PlaybackAlertsProps {
  trackError: string | null;
  autoplayBlocked: boolean;
  onDismissError: () => void;
  onUnlockAutoplay: () => void;
}

export function PlaybackAlerts({
  trackError,
  autoplayBlocked,
  onDismissError,
  onUnlockAutoplay,
}: PlaybackAlertsProps) {
  return (
    <>
      {trackError && (
        <div className="flex items-center justify-between bg-red-900/80 text-white text-xs px-4 py-2 rounded-md mb-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <AlertCircle className="shrink-0" size={14} />
            <span>{trackError}</span>
          </div>
          <button
            aria-label="Dismiss error"
            className="ml-4 hover:opacity-70 shrink-0"
            onClick={onDismissError}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {autoplayBlocked && (
        <div
          className="flex items-center justify-between bg-yellow-900/80 text-white text-xs px-4 py-2 rounded-md mb-2 max-w-7xl mx-auto cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={onUnlockAutoplay}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onUnlockAutoplay();
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-yellow-300 font-bold mr-1">
              🎵
            </span>
            <span>Click anywhere to start playback</span>
          </div>
          <span className="text-yellow-300 text-xs underline">Tap to play</span>
        </div>
      )}
    </>
  );
}
