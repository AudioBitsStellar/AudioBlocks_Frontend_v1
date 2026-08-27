'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { WaveformDisplay } from '@/components/ui/WaveformDisplay';
import { useAudioBuffer } from '@/hooks/useAudioBuffer';

const COVER_FALLBACK = '/placeholder-cover.svg';

// Downsamples a decoded AudioBuffer's first channel into a fixed number of
// normalized [0, 1] amplitude bars for WaveformDisplay.
function getWaveformPeaks(buffer: AudioBuffer, numBars = 100): number[] {
  const channel = buffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channel.length / numBars));
  const peaks: number[] = [];
  for (let i = 0; i < numBars; i++) {
    const start = i * blockSize;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channel[start + j] ?? 0);
    }
    peaks.push(Math.min(1, (sum / blockSize) * 4));
  }
  return peaks;
}

export const FullScreenPlayer = ({
  onClose,
  audioRef,
  audioSrc,
  duration,
  title,
  artist,
  cover,
  trackKey,
}: {
  onClose: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioSrc: string;
  duration: number;
  title?: string;
  artist?: string;
  cover?: string;
  trackKey: string;
}) => {
  const { buffer } = useAudioBuffer(audioSrc);
  const [currentTime, setCurrentTime] = useState(0);

  const peaks = useMemo(() => (buffer ? getWaveformPeaks(buffer) : undefined), [buffer]);

  // Reset the visual playhead when the track changes.
  useEffect(() => {
    setCurrentTime(0);
  }, [trackKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [audioRef]);

  const handleSeek = (_progress: number, seekTime?: number) => {
    if (audioRef.current && typeof seekTime === 'number') {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  return (
    <motion.div
      animate={{ y: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      exit={{ y: '100%' }}
      initial={{ y: '100%' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onDragEnd={(e, info) => {
        if (info.offset.y > 100) onClose();
      }}
    >
      <button className="absolute top-4 right-4 text-white p-2" type="button" onClick={onClose}>
        Close
      </button>
      <div className="w-64 h-64 relative rounded-md mb-8 overflow-hidden bg-gray-800">
        <Image
          fill
          alt={title ?? 'Now playing'}
          className="object-cover"
          src={cover || COVER_FALLBACK}
        />
      </div>
      <div className="text-white text-2xl font-bold text-center">{title || 'Now Playing'}</div>
      {artist && <div className="text-gray-400 text-sm mb-6 text-center">{artist}</div>}
      <div className="w-full max-w-md px-4 mt-6">
        <WaveformDisplay
          currentTime={currentTime}
          data={peaks}
          duration={duration}
          height={100}
          onSeek={handleSeek}
        />
      </div>
    </motion.div>
  );
};
