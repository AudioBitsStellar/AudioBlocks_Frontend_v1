'use client';

import { useEffect, useRef } from 'react';

interface MediaSessionTrack {
  title: string;
  artist: string;
  cover: string;
}

interface UseMediaSessionOptions {
  track: MediaSessionTrack | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onSeekBackward?: (seekOffset: number) => void;
  onSeekForward?: (seekOffset: number) => void;
  onPrevTrack?: () => void;
  onNextTrack?: () => void;
  onSeekTo?: (seekTime: number) => void;
}

export function useMediaSession({
  track,
  isPlaying,
  duration,
  currentTime,
  onPlay,
  onPause,
  onSeekBackward,
  onSeekForward,
  onPrevTrack,
  onNextTrack,
  onSeekTo,
}: UseMediaSessionOptions) {
  const trackRef = useRef(track);
  trackRef.current = track;

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;

    // Update metadata
    if (track) {
      ms.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: track.cover
          ? [{ src: track.cover, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });
    }

    ms.playbackState = isPlaying ? 'playing' : 'paused';
  }, [track, isPlaying]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;

    ms.setActionHandler('play', () => onPlay());
    ms.setActionHandler('pause', () => onPause());

    if (onSeekBackward) {
      ms.setActionHandler('seekbackward', (e) => {
        const offset = e.seekOffset || 10;
        onSeekBackward(offset);
      });
    } else {
      ms.setActionHandler('seekbackward', null);
    }

    if (onSeekForward) {
      ms.setActionHandler('seekforward', (e) => {
        const offset = e.seekOffset || 10;
        onSeekForward(offset);
      });
    } else {
      ms.setActionHandler('seekforward', null);
    }

    if (onPrevTrack) {
      ms.setActionHandler('previoustrack', () => onPrevTrack());
    } else {
      ms.setActionHandler('previoustrack', null);
    }

    if (onNextTrack) {
      ms.setActionHandler('nexttrack', () => onNextTrack());
    } else {
      ms.setActionHandler('nexttrack', null);
    }

    if (onSeekTo) {
      ms.setActionHandler('seekto', (e) => {
        if (e.seekTime != null) {
          onSeekTo(e.seekTime);
        }
      });
    } else {
      ms.setActionHandler('seekto', null);
    }

    return () => {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('seekbackward', null);
      ms.setActionHandler('seekforward', null);
      ms.setActionHandler('previoustrack', null);
      ms.setActionHandler('nexttrack', null);
      ms.setActionHandler('seekto', null);
    };
  }, [onPlay, onPause, onSeekBackward, onSeekForward, onPrevTrack, onNextTrack, onSeekTo]);
}
