'use client';

import { memo } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (newVolume: number) => void;
  onToggleMute: () => void;
}

export const VolumeControl = memo(function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const currentVolume = isMuted ? 0 : volume;

  return (
    <div className="relative group flex items-center justify-center">
      <button
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        className="hover:text-gray-300 text-white"
        onClick={onToggleMute}
      >
        {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      <div className="absolute bottom-16 p-4 rounded-md bg-[#161616] rotate-[-90deg] items-center justify-center hidden group-hover:flex group-focus-within:flex">
        <input
          aria-label="Volume"
          aria-valuemax={1}
          aria-valuemin={0}
          aria-valuenow={currentVolume}
          aria-valuetext={`${Math.round(currentVolume * 100)}%`}
          className="w-24 h-1 bg-gray-300 rounded appearance-none cursor-pointer accent-[#D2045B]"
          max={1}
          min={0}
          role="slider"
          step={0.01}
          type="range"
          value={currentVolume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
});
