'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export interface ProgressBarProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  duration: number;
  isPlaying: boolean;
  resetKey: string;
}

/**
 * Renders the scrubber and drives it from a requestAnimationFrame loop instead
 * of React state, so playback position updates at display refresh rate without
 * re-rendering the rest of the player on every tick.
 *
 * Seeking with preview (#330): hovering the bar shows a tooltip with the
 * target time, and while scrubbing the audio element follows the pointer so
 * the listener hears the segment they're scrubbing over (ducked while
 * previewing, restored on release).
 */
export const ProgressBar = memo(function ProgressBar({
  audioRef,
  duration,
  isPlaying,
  resetKey,
}: ProgressBarProps) {
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const currentTimeRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const scrubbingRef = useRef(false);
  const savedVolumeRef = useRef(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);

  const paint = useCallback(
    (time: number) => {
      const range = rangeRef.current;
      if (range) {
        range.value = String(time);
        const pct = duration ? (time / duration) * 100 : 0;
        range.style.background = `linear-gradient(to right, #B6195B 0%, #B6195B ${pct}%, rgb(82,82,82) ${pct}%, rgb(82,82,82) 100%)`;
        range.setAttribute('aria-valuenow', String(Math.floor(time)));
        range.setAttribute('aria-valuetext', `${formatTime(time)} of ${formatTime(duration)}`);
      }
      if (currentTimeRef.current) {
        currentTimeRef.current.textContent = formatTime(time);
      }
    },
    [duration]
  );

  // Reset the scrubber to 0 whenever the track changes
  useEffect(() => {
    paint(0);
  }, [resetKey, paint]);

  // Pause position updates while scrubbing
  useEffect(() => {
    if (!isPlaying || isScrubbing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = () => {
      const audio = audioRef.current;
      if (audio) paint(audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying, isScrubbing, audioRef, paint]);

  const computePreviewTime = useCallback(
    (clientX: number) => {
      const range = rangeRef.current;
      if (!range) return null;
      const rect = range.getBoundingClientRect();
      if (rect.width === 0) return null;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const startScrub = useCallback(() => {
    scrubbingRef.current = true;
    setIsScrubbing(true);
    const audio = audioRef.current;
    if (audio && !audio.muted && audio.volume > 0) {
      savedVolumeRef.current = audio.volume;
      audio.volume = Math.min(audio.volume, 0.35);
    }
  }, [audioRef]);

  const endScrub = useCallback(() => {
    scrubbingRef.current = false;
    setIsScrubbing(false);
    const audio = audioRef.current;
    const range = rangeRef.current;
    const target = range ? Number(range.value) : 0;
    if (audio) {
      audio.currentTime = target;
      audio.volume = savedVolumeRef.current;
    }
    paint(target);
  }, [audioRef, paint]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setPreviewTime(computePreviewTime(e.clientX));
    },
    [computePreviewTime]
  );

  const handlePointerLeave = useCallback(() => {
    if (!scrubbingRef.current) setPreviewTime(null);
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = Number(e.target.value);
      setPreviewTime(newTime);
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
      paint(newTime);
    },
    [audioRef, paint]
  );

  const previewPct = previewTime !== null && duration > 0 ? (previewTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span ref={currentTimeRef} className="text-xs text-white w-8">
        0:00
      </span>
      <div
        className="relative flex-1"
        onPointerCancel={endScrub}
        onPointerDown={startScrub}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={endScrub}
      >
        <input
          ref={rangeRef}
          aria-label="Track position"
          aria-valuemax={duration}
          aria-valuemin={0}
          className="w-full h-1 bg-gray-600 rounded appearance-none cursor-pointer accent-[#D2045B]"
          defaultValue={0}
          max={duration}
          min={0}
          role="slider"
          step={1}
          type="range"
          onChange={handleSeek}
        />
        {previewTime !== null && (
          <div
            className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-black px-1.5 py-0.5 text-[10px] text-white shadow"
            role="tooltip"
            style={{ left: `${previewPct}%` }}
          >
            {formatTime(previewTime)}
          </div>
        )}
      </div>
      <span className="text-xs text-white w-8 text-right">{formatTime(duration)}</span>
    </div>
  );
});
