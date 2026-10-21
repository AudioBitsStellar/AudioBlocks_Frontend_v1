'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { WaveformDisplay } from '@/components/ui/WaveformDisplay';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { useAudioBuffer } from '@/hooks/useAudioBuffer';
import { MoreVertical } from 'lucide-react';
import { OnChainInfo, type OnChainInfoProps } from '@/components/common/OnChainInfo';
import { SleepTimerMenu } from '@/components/player/SleepTimerMenu';
import { LyricsDisplay } from '@/components/LyricsDisplay';
import { useSongLyrics } from '@/hooks/useSongLyrics';
import type { SleepTimer, SleepTimerOption } from '@/lib/sleepTimer';

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
  songId,
  onChain,
  sleepTimer,
  onSelectSleepTimer,
  onCancelSleepTimer,
}: {
  onClose: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioSrc: string;
  duration: number;
  title?: string;
  artist?: string;
  cover?: string;
  trackKey: string;
  /** Backend song ID used to fetch lyrics (#583). Omit for tracks without one. */
  songId?: string;
  /** On-chain provenance for the song. Omit when the song has no mint data. */
  onChain?: OnChainInfoProps;
  /** Sleep timer controls (#589). Omit both handlers to hide the controls. */
  sleepTimer?: SleepTimer | null;
  onSelectSleepTimer?: (option: SleepTimerOption) => void;
  onCancelSleepTimer?: () => void;
}) => {
  const { buffer } = useAudioBuffer(audioSrc);
  const [currentTime, setCurrentTime] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | undefined>();
  const [visualizerEnabled, setVisualizerEnabled] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const lyricsQuery = useSongLyrics(songId, showLyrics);
  const audioContextRef = React.useRef<AudioContext | null>(null);

  const peaks = useMemo(() => (buffer ? getWaveformPeaks(buffer) : undefined), [buffer]);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }, []);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const defaultVisualizerState = !isMobile && !prefersReducedMotion;

  useEffect(() => {
    const savedPreference = localStorage.getItem('visualizer-enabled');
    setVisualizerEnabled(savedPreference === 'true' ? true : defaultVisualizerState);
  }, [defaultVisualizerState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !visualizerEnabled) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;
      const source = ctx.createMediaElementAudioSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      setAnalyserNode(analyser);
    } catch (err) {
      console.warn('Failed to create analyser node:', err);
    }
  }, [audioRef, visualizerEnabled]);

  const toggleVisualizer = useCallback(() => {
    const newState = !visualizerEnabled;
    setVisualizerEnabled(newState);
    localStorage.setItem('visualizer-enabled', newState.toString());
  }, [visualizerEnabled]);

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

  const handleClose = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    onClose();
  }, [onClose]);

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
        if (info.offset.y > 100) handleClose();
      }}
    >
      <button
        className="absolute top-4 right-4 text-white p-2"
        type="button"
        onClick={handleClose}
      >
        Close
      </button>

      <div className="absolute top-4 right-14">
        <button
          className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          onClick={() => setShowMenu(!showMenu)}
          type="button"
          aria-label="Player menu"
        >
          <MoreVertical size={20} />
        </button>
        {showMenu && (
          <div className="absolute right-0 mt-2 bg-gray-900 rounded-lg shadow-lg border border-gray-700 min-w-48 z-10">
            <button
              className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 text-sm transition-colors first:rounded-t-lg"
              onClick={() => {
                toggleVisualizer();
                setShowMenu(false);
              }}
              type="button"
            >
              {visualizerEnabled ? '✓ ' : ''}
              Visualizer {visualizerEnabled ? 'On' : 'Off'}
            </button>
            {onSelectSleepTimer && onCancelSleepTimer && (
              <div className="border-t border-gray-700 p-3">
                <SleepTimerMenu
                  sleepTimer={sleepTimer ?? null}
                  onCancel={onCancelSleepTimer}
                  onSelect={(option) => {
                    onSelectSleepTimer(option);
                    setShowMenu(false);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {visualizerEnabled && (
        <div className="absolute inset-0 opacity-30">
          <AudioVisualizer analyserNode={analyserNode} isEnabled={visualizerEnabled} />
        </div>
      )}

      {showLyrics ? (
        // Keeps scrolling the lyrics from starting the drag-to-close gesture on the player.
        <div
          className="w-full max-w-md h-64 mb-8 px-4 flex items-center justify-center"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <LyricsDisplay
            isError={lyricsQuery.isError}
            isLoading={lyricsQuery.isLoading}
            lyrics={lyricsQuery.data}
            onRetry={() => void lyricsQuery.refetch()}
          />
        </div>
      ) : (
        <div className="w-64 h-64 relative rounded-md mb-8 overflow-hidden bg-gray-800">
          <Image
            fill
            alt={title ?? 'Now playing'}
            className="object-cover"
            src={cover || COVER_FALLBACK}
          />
        </div>
      )}
      <div className="text-white text-2xl font-bold text-center">{title || 'Now Playing'}</div>
      {artist && <div className="text-gray-400 text-sm mb-4 text-center">{artist}</div>}
      <button
        aria-pressed={showLyrics}
        className="mb-6 px-3 py-1 text-xs font-semibold text-white border border-gray-600 rounded-full hover:bg-white/10 transition-colors"
        type="button"
        onClick={() => setShowLyrics((open) => !open)}
      >
        {showLyrics ? 'Hide lyrics' : 'Show lyrics'}
      </button>
      {onChain && (
        <div className="w-full max-w-md px-4 mb-6">
          <OnChainInfo {...onChain} />
        </div>
      )}
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
