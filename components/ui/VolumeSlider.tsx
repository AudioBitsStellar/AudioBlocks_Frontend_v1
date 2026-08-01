'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';
import { usePlayback } from '@/context/PlaybackContext';

type PlaybackVolumeState = {
  volume: number;
  setVolume: (volume: number) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Converts the linear audio volume used by the audio element into the
 * perceptual slider position shown to the listener.
 */
const volumeToSliderValue = (volume: number) => Math.sqrt(clamp(volume, 0, 1)) * 100;

/**
 * Converts a slider position into linear audio volume.
 * A quadratic curve gives finer control at lower perceived volume levels.
 */
const sliderValueToVolume = (sliderValue: number) => Math.pow(clamp(sliderValue, 0, 100) / 100, 2);

export function VolumeSlider() {
  const playback = usePlayback() as unknown as PlaybackVolumeState;
  const volume = clamp(playback.volume, 0, 1);
  const sliderValue = volumeToSliderValue(volume);
  const previousVolume = useRef(volume > 0 ? volume : 1);

  useEffect(() => {
    if (volume > 0) {
      previousVolume.current = volume;
    }
  }, [volume]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      playback.setVolume(sliderValueToVolume(Number(event.target.value)));
    },
    [playback]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      let nextSliderValue: number | undefined;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          nextSliderValue = sliderValue - 5;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          nextSliderValue = sliderValue + 5;
          break;
        case 'Home':
          nextSliderValue = 0;
          break;
        case 'End':
          nextSliderValue = 100;
          break;
        default:
          return;
      }

      event.preventDefault();
      playback.setVolume(sliderValueToVolume(nextSliderValue));
    },
    [playback, sliderValue]
  );

  const handleMuteToggle = useCallback(() => {
    if (volume === 0) {
      playback.setVolume(previousVolume.current > 0 ? previousVolume.current : 1);
    } else {
      previousVolume.current = volume;
      playback.setVolume(0);
    }
  }, [playback, volume]);

  const isMuted = volume === 0;
  const isLow = !isMuted && volume <= 1 / 3;
  const isMedium = volume > 1 / 3 && volume <= 2 / 3;
  const isHigh = volume > 2 / 3;

  return (
    <div className="flex items-center gap-2 text-white">
      <button
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors hover:text-[#F2AFC9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
        type="button"
        onClick={handleMuteToggle}
      >
        <VolumeX
          aria-hidden="true"
          className={`absolute h-5 w-5 transition-opacity duration-200 ${isMuted ? 'opacity-100' : 'opacity-0'}`}
        />
        <Volume
          aria-hidden="true"
          className={`absolute h-5 w-5 transition-opacity duration-200 ${isLow ? 'opacity-100' : 'opacity-0'}`}
        />
        <Volume1
          aria-hidden="true"
          className={`absolute h-5 w-5 transition-opacity duration-200 ${isMedium ? 'opacity-100' : 'opacity-0'}`}
        />
        <Volume2
          aria-hidden="true"
          className={`absolute h-5 w-5 transition-opacity duration-200 ${isHigh ? 'opacity-100' : 'opacity-0'}`}
        />
      </button>

      <input
        aria-label="Volume"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(sliderValue)}
        aria-valuetext={`${Math.round(volume * 100)}%`}
        className="h-1.5 w-24 cursor-pointer accent-[#D2045B]"
        max={100}
        min={0}
        step={1}
        type="range"
        value={sliderValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export default VolumeSlider;
