'use client';

import { memo } from 'react';
import { Loader2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from 'lucide-react';

export interface PlayerControlsProps {
  isPlaying: boolean;
  isBuffering: boolean;
  shuffle: boolean;
  repeat: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

export const PlayerControls = memo(function PlayerControls({
  isPlaying,
  isBuffering,
  shuffle,
  repeat,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
}: PlayerControlsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        aria-label="Toggle shuffle"
        className={`hover:text-gray-300 cursor-pointer text-white ${shuffle ? 'text-pink-500' : ''}`}
        onClick={onToggleShuffle}
      >
        <Shuffle size={16} />
      </button>

      <button
        aria-label="Previous track"
        className="hover:text-gray-300 cursor-pointer text-white"
        onClick={onPrev}
      >
        <SkipBack size={16} />
      </button>

      <button
        aria-label={isBuffering ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
        className="p-2 rounded-full bg-white flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 justify-center"
        disabled={isBuffering}
        onClick={onTogglePlay}
      >
        {isBuffering ? (
          <Loader2 className="text-gray-800 animate-spin" size={14} />
        ) : isPlaying ? (
          <Pause className="text-gray-800" size={14} />
        ) : (
          <Play className="text-gray-800" size={14} />
        )}
      </button>

      <button aria-label="Next track" className="hover:text-gray-300 text-white" onClick={onNext}>
        <SkipForward size={15} />
      </button>

      <button
        aria-label="Toggle repeat"
        className={`hover:text-gray-300 text-white ${repeat ? 'text-pink-500' : ''}`}
        onClick={onToggleRepeat}
      >
        <Repeat size={16} />
      </button>
    </div>
  );
});
