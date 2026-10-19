import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  createGainRoute,
  disconnect,
  type GainRoute,
  type NormalizationGraph,
} from '@/lib/player/audioGraph';
import { resolveStreamUrl } from '@/lib/player/streamUrl';
import type { Track } from '@/context/PlaybackContext';

export interface UseCrossfadeOptions {
  audioRef: RefObject<HTMLAudioElement | null>;
  normGraphRef: RefObject<NormalizationGraph | null>;
  ensureAudioContext: () => AudioContext | null;
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
  /** Effective output level: 0 when muted, otherwise the volume. */
  level: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: boolean;
  queueLength: number;
  crossfadeDuration: number;
  gapless: boolean;
  next: () => void;
  setCrossfading: (crossfading: boolean) => void;
}

/**
 * Drives the secondary ("incoming") <audio> element used by crossfade (#115)
 * and gapless preloading (#329). Crossfade details: `docs/CROSSFADE.md`.
 */
export function useCrossfade({
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
  queueLength,
  crossfadeDuration,
  gapless,
  next,
  setCrossfading,
}: UseCrossfadeOptions) {
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const outgoingRouteRef = useRef<GainRoute | null>(null);
  const incomingRouteRef = useRef<GainRoute | null>(null);
  const crossfadeRafRef = useRef<number | null>(null);
  const crossfadeActiveRef = useRef(false);
  const [incomingUrl, setIncomingUrl] = useState<string | null>(null);
  // True once the preloaded (gapless) next track can start playing (#329).
  const [incomingReady, setIncomingReady] = useState(false);

  const resolveNextIndex = useCallback(() => {
    if (playlist.length === 0) return -1;
    if (shuffle) return Math.floor(Math.random() * playlist.length);
    return (currentIndex + 1) % playlist.length;
  }, [playlist.length, shuffle, currentIndex]);

  const cleanupIncoming = useCallback(() => {
    if (crossfadeRafRef.current !== null) {
      cancelAnimationFrame(crossfadeRafRef.current);
      crossfadeRafRef.current = null;
    }
    crossfadeActiveRef.current = false;
    setCrossfading(false);

    const incoming = incomingAudioRef.current;
    if (incoming) {
      incoming.pause();
      incoming.removeAttribute('src');
      incoming.load();
    }
    disconnect(incomingRouteRef.current?.source, incomingRouteRef.current?.gain);
    incomingRouteRef.current = null;
    setIncomingUrl(null);
  }, [setCrossfading]);

  const finishCrossfade = useCallback(() => {
    const primary = audioRef.current;
    const incoming = incomingAudioRef.current;
    if (primary && incoming?.src) {
      // Swap: primary takes over the incoming stream position/volume.
      const incomingTime = incoming.currentTime;
      primary.src = incoming.src;
      primary.currentTime = incomingTime;
      primary.volume = level;
      if (isPlaying) void primary.play().catch(() => {});
    }
    // Restore the normalization gain pinned to 1 during the fade (#328).
    if (normGraphRef.current) normGraphRef.current.gain.gain.value = level;
    cleanupIncoming();
  }, [audioRef, normGraphRef, cleanupIncoming, level, isPlaying]);

  const startCrossfade = useCallback(async () => {
    if (crossfadeActiveRef.current || crossfadeDuration <= 0 || repeat) return;
    const primary = audioRef.current;
    if (!primary || !Number.isFinite(primary.duration) || primary.duration <= 0) return;

    const nextIdx = resolveNextIndex();
    if (nextIdx < 0 || nextIdx === currentIndex) return;
    const nextUrl = resolveStreamUrl(playlist[nextIdx], nextIdx);
    if (!nextUrl) return;

    crossfadeActiveRef.current = true;
    setCrossfading(true);
    setIncomingUrl(nextUrl);

    // Wait a frame so the incoming <audio> mounts with the new src.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const incoming = incomingAudioRef.current;
    if (!incoming) return cleanupIncoming();

    incoming.volume = 0;
    incoming.muted = isMuted;
    try {
      await incoming.play();
    } catch {
      return cleanupIncoming();
    }

    // The normalization gain would double-apply the envelope — pin it to 1 (#328).
    if (normGraphRef.current?.element === primary) normGraphRef.current.gain.gain.value = 1;

    // Prefer Web Audio gain nodes; fall back to element.volume envelopes.
    const ctx = ensureAudioContext();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') await ctx.resume();
        outgoingRouteRef.current ??= createGainRoute(ctx, primary, level);
        incomingRouteRef.current = createGainRoute(ctx, incoming, 0);
      } catch {
        // createMediaElementSource can only be called once per element.
      }
    }

    const durationMs = crossfadeDuration * 1000;
    const start = performance.now();
    const tick = (now: number) => {
      if (!crossfadeActiveRef.current) return;
      const t = Math.min(1, (now - start) / durationMs);
      const outgoingGain = outgoingRouteRef.current?.gain;
      const incomingGain = incomingRouteRef.current?.gain;
      if (outgoingGain && incomingGain) {
        outgoingGain.gain.value = level * (1 - t);
        incomingGain.gain.value = level * t;
      } else {
        primary.volume = level * (1 - t);
        incoming.volume = level * t;
      }

      if (t < 1 && isPlaying) {
        crossfadeRafRef.current = requestAnimationFrame(tick);
      } else if (t >= 1) {
        next();
        finishCrossfade();
      } else {
        // Paused mid-crossfade — hold both elements at the current envelope.
        primary.pause();
        incoming.pause();
      }
    };
    crossfadeRafRef.current = requestAnimationFrame(tick);
  }, [
    audioRef,
    normGraphRef,
    ensureAudioContext,
    crossfadeDuration,
    repeat,
    resolveNextIndex,
    currentIndex,
    playlist,
    setCrossfading,
    isMuted,
    cleanupIncoming,
    level,
    isPlaying,
    next,
    finishCrossfade,
  ]);

  // Kick off the crossfade when the remaining time enters the fade window.
  useEffect(() => {
    if (!isPlaying || crossfadeDuration <= 0 || repeat) return;
    let raf: number | null = null;
    const watch = () => {
      const audio = audioRef.current;
      if (
        audio &&
        !crossfadeActiveRef.current &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= crossfadeDuration && remaining > 0) {
          void startCrossfade();
          return;
        }
      }
      raf = requestAnimationFrame(watch);
    };
    raf = requestAnimationFrame(watch);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [audioRef, isPlaying, crossfadeDuration, repeat, currentIndex, startCrossfade]);

  // Gapless (#329): preload the next track. Only sequential playback with an
  // empty queue is eligible — shuffle/queue order is decided at transition time.
  useEffect(() => {
    if (!gapless || !isPlaying || crossfadeDuration > 0 || crossfadeActiveRef.current) return;
    if (shuffle || queueLength > 0 || repeat) return;
    const nextIdx = resolveNextIndex();
    if (nextIdx < 0 || nextIdx === currentIndex) return;
    const url = resolveStreamUrl(playlist[nextIdx], nextIdx);
    if (url) setIncomingUrl(url);
  }, [
    gapless,
    isPlaying,
    crossfadeDuration,
    shuffle,
    queueLength,
    repeat,
    currentIndex,
    playlist,
    resolveNextIndex,
  ]);

  useEffect(() => {
    setIncomingReady(false);
  }, [incomingUrl]);

  /** Swaps in the preloaded track on `ended`; returns false when not eligible (#329). */
  const tryGaplessHandoff = useCallback(() => {
    const primary = audioRef.current;
    const incoming = incomingAudioRef.current;
    if (!gapless || !incomingReady || shuffle || queueLength > 0 || !incoming?.src || !primary) {
      return false;
    }
    primary.src = incoming.src;
    primary.currentTime = 0;
    if (isPlaying) void primary.play().catch(() => {});
    next();
    cleanupIncoming();
    return true;
  }, [audioRef, gapless, incomingReady, shuffle, queueLength, isPlaying, next, cleanupIncoming]);

  return {
    incomingAudioRef,
    outgoingRouteRef,
    crossfadeActiveRef,
    incomingUrl,
    setIncomingReady,
    cleanupIncoming,
    finishCrossfade,
    tryGaplessHandoff,
  };
}
