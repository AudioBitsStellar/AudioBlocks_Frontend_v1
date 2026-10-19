import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyNormalizationParams,
  createAudioContext,
  createNormalizationGraph,
  disconnect,
  type NormalizationGraph,
} from '@/lib/player/audioGraph';
import { resolveStreamUrl } from '@/lib/player/streamUrl';
import { useCrossfade } from './useCrossfade';
import type { Track } from '@/context/PlaybackContext';

export interface UseAudioEngineOptions {
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: boolean;
  queue: Track[];
  crossfadeDuration: number;
  normalizeAudio: boolean;
  gapless: boolean;
  play: () => void;
  pause: () => void;
  next: () => void;
  setError: (message: string) => void;
  addToRecentlyPlayed: (track: Track) => void;
  setAutoplayBlocked: (blocked: boolean) => void;
  setCrossfading: (crossfading: boolean) => void;
}

/**
 * Owns the primary <audio> element and the Web Audio graph (#602): play/pause
 * and volume sync, loudness normalization (#328), playback speed (#336),
 * error skipping and resource release on unload. Crossfade (#115) and gapless
 * preloading (#329) are delegated to `useCrossfade`.
 */
export function useAudioEngine({
  playlist,
  currentIndex,
  isPlaying,
  volume,
  isMuted,
  shuffle,
  repeat,
  queue,
  crossfadeDuration,
  normalizeAudio,
  gapless,
  play,
  pause,
  next,
  setError,
  addToRecentlyPlayed,
  setAutoplayBlocked,
  setCrossfading,
}: UseAudioEngineOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const normGraphRef = useRef<NormalizationGraph | null>(null);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const currentTrack = playlist[currentIndex];
  const streamUrl = resolveStreamUrl(currentTrack, currentIndex);
  const level = isMuted ? 0 : volume;

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
    return audioCtxRef.current;
  }, []);

  const crossfade = useCrossfade({
    audioRef,
    normGraphRef,
    ensureAudioContext,
    playlist,
    currentIndex,
    isPlaying,
    level,
    isMuted,
    shuffle,
    repeat,
    queueLength: queue.length,
    crossfadeDuration,
    gapless,
    next,
    setCrossfading,
  });
  const {
    incomingAudioRef,
    outgoingRouteRef,
    crossfadeActiveRef,
    cleanupIncoming,
    finishCrossfade,
    tryGaplessHandoff,
  } = crossfade;

  // `createMediaElementSource` may only be called once per element, so the
  // graph is rebuilt only when the primary element changes (track switch).
  const ensureNormalizationGraph = useCallback(
    (primary: HTMLAudioElement) => {
      const ctx = ensureAudioContext();
      if (!ctx) return;
      const graph = normGraphRef.current;
      if (graph?.element === primary) return;
      if (graph) disconnect(graph.source, graph.gain);
      normGraphRef.current = createNormalizationGraph(ctx, primary);
    },
    [ensureAudioContext]
  );

  useEffect(() => {
    setIsBuffering(false);
    if (currentTrack) addToRecentlyPlayed(currentTrack);
    // Abort any in-flight crossfade when the track changes externally.
    if (crossfadeActiveRef.current) cleanupIncoming();
  }, [currentIndex, currentTrack, addToRecentlyPlayed, crossfadeActiveRef, cleanupIncoming]);

  // currentIndex re-syncs play state on track change.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setAutoplayBlocked(true);
        } else {
          setError(`Unable to load "${currentTrack?.title ?? 'track'}". Skipping to next track…`);
        }
      });
      // Resume the incoming element if we paused mid-crossfade.
      if (crossfadeActiveRef.current) void incomingAudioRef.current?.play().catch(() => {});
    } else {
      audio.pause();
      incomingAudioRef.current?.pause();
    }
  }, [
    isPlaying,
    currentIndex,
    currentTrack?.title,
    setAutoplayBlocked,
    setError,
    crossfadeActiveRef,
    incomingAudioRef,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    // Don't clobber the crossfade envelope.
    if (!audio || crossfadeActiveRef.current) return;
    audio.volume = level;
    audio.muted = isMuted;
    if (outgoingRouteRef.current) outgoingRouteRef.current.gain.gain.value = level;
    if (normGraphRef.current) normGraphRef.current.gain.gain.value = level;
  }, [level, isMuted, crossfadeActiveRef, outgoingRouteRef]);

  // streamUrl rebuilds the graph when the primary element changes (#328).
  useEffect(() => {
    const primary = audioRef.current;
    if (!primary) return;
    if (!normalizeAudio) {
      applyNormalizationParams(normGraphRef.current?.compressor, false);
      return;
    }
    ensureNormalizationGraph(primary);
    applyNormalizationParams(normGraphRef.current?.compressor, true);
    if (normGraphRef.current) normGraphRef.current.gain.gain.value = level;
  }, [normalizeAudio, streamUrl, level, ensureNormalizationGraph]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
    if (incomingAudioRef.current) incomingAudioRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed, incomingAudioRef]);

  // Release audio on tab close / external navigation so streaming isn't orphaned.
  useEffect(() => {
    const releaseAudio = () => {
      cleanupIncoming();
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      audio.src = '';
      audio.load();
      disconnect(outgoingRouteRef.current?.source, outgoingRouteRef.current?.gain);
      disconnect(normGraphRef.current?.source, normGraphRef.current?.gain);
      outgoingRouteRef.current = null;
      normGraphRef.current = null;
      void audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
    window.addEventListener('beforeunload', releaseAudio);
    window.addEventListener('pagehide', releaseAudio);
    return () => {
      window.removeEventListener('beforeunload', releaseAudio);
      window.removeEventListener('pagehide', releaseAudio);
      releaseAudio();
    };
  }, [cleanupIncoming, outgoingRouteRef]);

  useEffect(
    () => () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    },
    []
  );

  const togglePlay = useCallback(() => {
    if (isBuffering) return;
    if (isPlaying) pause();
    else play();
  }, [isBuffering, isPlaying, pause, play]);

  const handleError = useCallback(() => {
    if (crossfadeActiveRef.current) cleanupIncoming();
    setError(
      currentTrack?.id
        ? `Unable to stream track "${currentTrack?.title}". The track may be unavailable or the ID is invalid.`
        : `Unable to load "${currentTrack?.title ?? 'track'}". Skipping to next track…`
    );
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    skipTimerRef.current = setTimeout(() => next(), 3000);
  }, [currentTrack, setError, next, crossfadeActiveRef, cleanupIncoming]);

  const handleEnded = useCallback(() => {
    if (crossfadeActiveRef.current) return finishCrossfade();
    if (repeat) {
      void audioRef.current?.play();
      return;
    }
    if (!tryGaplessHandoff()) next();
  }, [crossfadeActiveRef, finishCrossfade, repeat, tryGaplessHandoff, next]);

  return {
    audioRef,
    incomingAudioRef,
    streamUrl,
    duration,
    isBuffering,
    incomingUrl: crossfade.incomingUrl,
    playbackSpeed,
    setPlaybackSpeed,
    togglePlay,
    /** Event handlers for the primary <audio> element. */
    primaryHandlers: {
      onCanPlay: () => setIsBuffering(false),
      onEnded: handleEnded,
      onError: handleError,
      onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) =>
        setDuration(e.currentTarget.duration),
      onPlaying: () => setIsBuffering(false),
      onWaiting: () => setIsBuffering(true),
    },
    /** Event handlers for the incoming (crossfade / gapless) <audio> element. */
    incomingHandlers: {
      onCanPlay: () => crossfade.setIncomingReady(true),
      onError: cleanupIncoming,
    },
  };
}
