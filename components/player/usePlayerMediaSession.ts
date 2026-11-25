'use client';

import { type RefObject } from 'react';
import { useMediaSession } from '@/hooks/useMediaSession';

interface UsePlayerMediaSessionParams {
  currentTrack?: { title?: string; artist?: string; cover?: string };
  isPlaying: boolean;
  isBuffering: boolean;
  duration: number;
  audioRef: RefObject<HTMLAudioElement | null>;
  play: () => void;
  pause: () => void;
  prev: () => void;
  next: () => void;
}

export function usePlayerMediaSession({
  currentTrack,
  isPlaying,
  isBuffering,
  duration,
  audioRef,
  play,
  pause,
  prev,
  next,
}: UsePlayerMediaSessionParams) {
  useMediaSession({
    track: currentTrack?.title
      ? {
          title: currentTrack.title,
          artist: currentTrack.artist ?? '',
          cover: currentTrack.cover ?? '',
        }
      : null,
    isPlaying: isPlaying && !isBuffering,
    duration,
    currentTime: audioRef.current?.currentTime ?? 0,
    onPlay: play,
    onPause: pause,
    onPrevTrack: prev,
    onNextTrack: next,
    onSeekTo: (time) => {
      if (audioRef.current) audioRef.current.currentTime = time;
    },
    onSeekBackward: (offset) => {
      if (audioRef.current)
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - offset);
    },
    onSeekForward: (offset) => {
      if (audioRef.current)
        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + offset);
    },
  });
}
