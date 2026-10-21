'use client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { usePlayback, type PlaybackContextValue } from '@/context/PlaybackContext';
import { useOptionalUserPreferences } from '@/context/UserPreferencesContext';
import { useDataSaver } from '@/hooks/useDataSaver';
import { getStreamUrl } from '@/lib/apiUrl';
import { attachAudioSource, type AudioSource } from '@/lib/hlsPlayer';
import {
  clearResumePosition,
  formatResumeTime,
  getResumePosition,
  resumeStartTime,
  RESUME_SAVE_INTERVAL_MS,
  saveResumePosition,
  shouldRestorePosition,
} from '@/lib/resumePosition';
import {
  computeNormalizationGainDb,
  DEFAULT_NORMALIZATION_TARGET_LUFS,
  gainDbToLinear,
} from '@/lib/player/normalizationGain';
import { describeStreamQuality, resolveBitrateCap } from '@/lib/streamQuality';
import { isTrackAvailable } from '@/lib/tracks';

/** Only enable speculative manifests once a deployed backend counts actual playback events. */
export function canPrefetchStreams(): boolean {
  return (
    process.env.NEXT_PUBLIC_STREAM_PLAY_COUNT_MODE === 'event' &&
    !!process.env.NEXT_PUBLIC_PLAYBACK_EVENT_URL?.includes(':id')
  );
}

export function useQueuedAudio() {
  const playback = usePlayback();
  const dataSaver = useDataSaver();
  // Streaming quality ceiling (#590). `undefined` means no cap.
  const quality = useOptionalUserPreferences()?.preferences.audioQuality ?? 'auto';
  const bitrateCap = resolveBitrateCap(quality, dataSaver);
  const streamQuality = describeStreamQuality(quality, dataSaver);
  const normalizationTargetLufs =
    useOptionalUserPreferences()?.preferences.normalizationTargetLufs ??
    DEFAULT_NORMALIZATION_TARGET_LUFS;
  const deckARef = useRef<HTMLAudioElement | null>(null);
  const deckBRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const sources = useRef(new Map<HTMLAudioElement, AudioSource>());
  const loaded = useRef(new Map<HTMLAudioElement, string>());
  const ready = useRef(new Set<HTMLAudioElement>());
  const reported = useRef(new Set<HTMLAudioElement>());
  const fade = useRef<number | null>(null);
  const lastResumeSave = useRef(0);
  const transitionStart = useRef<number | null>(null);
  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failedTracks = useRef(new Set<string>());
  const failedPrefetches = useRef(new Set<string>());
  const promoted = useRef<string | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const compressors = useRef(
    new Map<
      HTMLAudioElement,
      {
        source: MediaElementAudioSourceNode;
        compressor: DynamicsCompressorNode;
        gain: GainNode;
      }
    >()
  );
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const currentTrack = playback.playlist[playback.currentIndex];
  const streamUrl = currentTrack?.url || (currentTrack ? getStreamUrl(currentTrack.id) : '');
  const nextTrack =
    playback.queue.find(isTrackAvailable) ??
    (!playback.shuffle
      ? [
          ...playback.playlist.slice(playback.currentIndex + 1),
          ...playback.playlist.slice(0, playback.currentIndex),
        ].find(isTrackAvailable)
      : undefined);
  const nextUrl = nextTrack?.url || (nextTrack ? getStreamUrl(nextTrack.id) : '');
  const queueKey = playback.queue
    .map((track) => `${track.id}:${track.available}:${track.url}`)
    .join('|');
  const live = useRef({
    playback,
    dataSaver,
    currentTrack,
    nextTrack,
    nextUrl,
    playbackSpeed,
    bitrateCap,
    normalizationTargetLufs,
  });
  live.current = {
    playback,
    dataSaver,
    currentTrack,
    nextTrack,
    nextUrl,
    playbackSpeed,
    bitrateCap,
    normalizationTargetLufs,
  };

  useEffect(() => {
    audioRef.current = deckARef.current;
    incomingAudioRef.current = deckBRef.current;
    const graphNodes = compressors.current;
    const elements = [deckARef.current, deckBRef.current].filter(
      (element): element is HTMLAudioElement => !!element
    );
    const dispose = (element: HTMLAudioElement) => {
      sources.current.get(element)?.destroy();
      sources.current.delete(element);
      loaded.current.delete(element);
      ready.current.delete(element);
      reported.current.delete(element);
    };
    const failPlayback = (message: string) => {
      const track = live.current.currentTrack;
      live.current.playback.setError(message);
      if (skipTimer.current) clearTimeout(skipTimer.current);
      if (track && !failedTracks.current.has(track.id)) {
        failedTracks.current.add(track.id);
        const hasNext = [...live.current.playback.queue, ...live.current.playback.playlist].some(
          (candidate) =>
            candidate.id !== track.id &&
            isTrackAvailable(candidate) &&
            !failedTracks.current.has(candidate.id)
        );
        if (hasNext) skipTimer.current = setTimeout(() => live.current.playback.next(), 3000);
      }
    };
    const stopFade = () => {
      if (fade.current !== null) cancelAnimationFrame(fade.current);
      fade.current = null;
      live.current.playback.setCrossfading(false);
    };
    const volume = () =>
      (live.current.playback.isMuted ? 0 : live.current.playback.volume) *
      live.current.playback.sleepFade;
    // "End of track" sleep must not start the next track early, so crossfade is off then (#589).
    const crossfadeAllowed = (state: PlaybackContextValue) =>
      state.crossfadeDuration > 0 && !state.repeat && state.sleepTimer?.kind !== 'end-of-track';
    // Resume (#588) follows the track whose stream is loaded in the element, not the state track.
    const trackIdFor = (url: string | undefined) => {
      const track = live.current.currentTrack;
      if (!url || !track) return undefined;
      return (track.url || getStreamUrl(track.id)) === url ? track.id : undefined;
    };
    // Loudness gain follows the track loaded in the element (#582). An incoming
    // element holds `nextTrack` until it is promoted.
    const trackForUrl = (url: string | undefined) =>
      [live.current.currentTrack, live.current.nextTrack].find(
        (track) => !!url && !!track && (track.url || getStreamUrl(track.id)) === url
      );
    const persistResume = (element: HTMLAudioElement, force = false) => {
      if (element !== audioRef.current || !element.duration) return;
      const trackId = trackIdFor(loaded.current.get(element));
      if (!trackId) return;
      const now = Date.now();
      if (!force && now - lastResumeSave.current < RESUME_SAVE_INTERVAL_MS) return;
      lastResumeSave.current = now;
      saveResumePosition(trackId, element.currentTime, element.duration, undefined, now);
    };
    const restoreResume = (element: HTMLAudioElement) => {
      const trackId = trackIdFor(loaded.current.get(element));
      if (!trackId) return;
      const saved = getResumePosition(trackId);
      if (!shouldRestorePosition(saved, element.duration)) return;
      element.currentTime = resumeStartTime(saved);
      toast(`Resumed from ${formatResumeTime(saved)}`, {
        action: {
          label: 'Start over',
          onClick: () => {
            element.currentTime = 0;
            clearResumePosition(trackId);
          },
        },
        duration: 6000,
      });
    };
    const configureAudio = (element: HTMLAudioElement) => {
      if (!live.current.playback.normalizeAudio && !compressors.current.has(element)) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = audioContext.current ?? new AudioCtx();
        audioContext.current = ctx;
        let graph = compressors.current.get(element);
        if (!graph) {
          const source = ctx.createMediaElementSource(element);
          const compressor = ctx.createDynamicsCompressor();
          const gain = ctx.createGain();
          source.connect(compressor);
          compressor.connect(gain);
          gain.connect(ctx.destination);
          graph = { source, compressor, gain };
          compressors.current.set(element, graph);
        }
        const enabled = live.current.playback.normalizeAudio;
        graph.compressor.threshold.value = enabled ? -24 : 0;
        graph.compressor.knee.value = enabled ? 30 : 0;
        graph.compressor.ratio.value = enabled ? 12 : 1;
        graph.compressor.attack.value = enabled ? 0.003 : 0;
        graph.compressor.release.value = enabled ? 0.25 : 0;
        const gainDb = computeNormalizationGainDb(
          trackForUrl(loaded.current.get(element)),
          live.current.normalizationTargetLufs
        );
        graph.gain.gain.value = enabled ? gainDbToLinear(gainDb) : 1;
        if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      } catch {
        /* Browsers without Web Audio keep element playback. */
      }
    };
    const play = (element: HTMLAudioElement) => {
      configureAudio(element);
      element.playbackRate = live.current.playbackSpeed;
      void element.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'NotAllowedError')
          live.current.playback.setAutoplayBlocked(true);
        else if (!(error instanceof DOMException && error.name === 'AbortError'))
          failPlayback('Unable to play this track. Try another song.');
      });
    };
    const load = (element: HTMLAudioElement, url: string, prefetch: boolean) => {
      dispose(element);
      loaded.current.set(element, url);
      const source = attachAudioSource(element, url, {
        prefetch,
        maxBitrateKbps: live.current.bitrateCap,
        onReady: () => {
          ready.current.add(element);
          if (element === audioRef.current && live.current.playback.isPlaying) play(element);
        },
        onError: (error) => {
          if (element === audioRef.current) failPlayback(error.message);
          else {
            failedPrefetches.current.add(url);
            dispose(element);
          }
        },
      });
      sources.current.set(element, source);
    };
    const promote = () => {
      const outgoing = audioRef.current;
      const incoming = incomingAudioRef.current;
      if (!outgoing || !incoming || loaded.current.get(incoming) !== live.current.nextUrl)
        return false;
      stopFade();
      outgoing.pause();
      audioRef.current = incoming;
      incomingAudioRef.current = outgoing;
      promoted.current = live.current.nextUrl;
      sources.current.get(incoming)?.resume();
      incoming.volume = volume();
      incoming.muted = live.current.playback.isMuted;
      play(incoming);
      dispose(outgoing);
      setDuration(Number.isFinite(incoming.duration) ? incoming.duration : 0);
      live.current.playback.next();
      return true;
    };
    const prepare = () => {
      const { playback: state, dataSaver: saver, nextUrl: url } = live.current;
      const incoming = incomingAudioRef.current;
      if (
        !incoming ||
        !url ||
        failedPrefetches.current.has(url) ||
        state.repeat ||
        saver ||
        !canPrefetchStreams() ||
        (!state.gapless && state.crossfadeDuration <= 0)
      )
        return;
      if (loaded.current.get(incoming) !== url) load(incoming, url, true);
    };
    const onTime = (element: HTMLAudioElement) => {
      if (element !== audioRef.current) return;
      const state = live.current.playback;
      const remaining = element.duration - element.currentTime;
      if (!state.isPlaying || !Number.isFinite(remaining)) return;
      if (remaining <= 20 && remaining > 0) prepare();
      const incoming = incomingAudioRef.current;
      // A crossfade starts real playback now, even while speculative loading is disabled.
      if (
        crossfadeAllowed(state) &&
        remaining <= state.crossfadeDuration &&
        remaining > 0 &&
        incoming &&
        live.current.nextUrl &&
        loaded.current.get(incoming) !== live.current.nextUrl
      ) {
        load(incoming, live.current.nextUrl, false);
      }
      if (
        crossfadeAllowed(state) &&
        fade.current === null &&
        incoming &&
        ready.current.has(incoming) &&
        remaining <= state.crossfadeDuration &&
        remaining > 0
      ) {
        state.setCrossfading(true);
        sources.current.get(incoming)?.resume();
        incoming.volume = 0;
        incoming.muted = state.isMuted;
        play(incoming);
        const start = performance.now();
        const length = (remaining * 1000) / element.playbackRate;
        const tick = () => {
          if (!live.current.playback.isPlaying) {
            stopFade();
            incoming.pause();
            element.volume = volume();
            return;
          }
          const fraction = Math.min(1, (performance.now() - start) / length);
          element.volume = volume() * (1 - fraction);
          incoming.volume = volume() * fraction;
          if (fraction >= 1) promote();
          else fade.current = requestAnimationFrame(tick);
        };
        fade.current = requestAnimationFrame(tick);
      }
    };
    const cleanups = elements.map((element) => {
      const time = () => {
        onTime(element);
        persistResume(element);
      };
      const paused = () => persistResume(element, true);
      const metadata = () => {
        if (element === audioRef.current) {
          setDuration(Number.isFinite(element.duration) ? element.duration : 0);
          restoreResume(element);
          onTime(element);
        }
      };
      const ended = () => {
        if (element !== audioRef.current) return;
        const finishedId = trackIdFor(loaded.current.get(element));
        if (finishedId) clearResumePosition(finishedId);
        // "End of track" sleep stops here instead of moving on to the next song (#589).
        if (live.current.playback.sleepTimer?.kind === 'end-of-track') {
          live.current.playback.expireSleepTimer();
          return;
        }
        if (live.current.playback.repeat) {
          element.currentTime = 0;
          play(element);
          return;
        }
        transitionStart.current = performance.now();
        if (!promote()) live.current.playback.next();
      };
      const playing = () => {
        if (element !== audioRef.current && fade.current === null) return;
        if (element === audioRef.current) {
          setIsBuffering(false);
          if (transitionStart.current !== null) {
            const gapMs = performance.now() - transitionStart.current;
            transitionStart.current = null;
            window.dispatchEvent(new CustomEvent('audioblocks:transition', { detail: { gapMs } }));
          }
        }
        const endpoint = process.env.NEXT_PUBLIC_PLAYBACK_EVENT_URL;
        if (canPrefetchStreams() && endpoint && !reported.current.has(element)) {
          reported.current.add(element);
          const track =
            element === audioRef.current ? live.current.currentTrack : live.current.nextTrack;
          // No reporting from manifest/segment callbacks; only audible playback reaches here.
          if (track)
            void fetch(endpoint.replace(':id', encodeURIComponent(track.id)), {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ songId: track.id }),
            }).catch(() => {});
        }
      };
      const waiting = () => {
        if (element === audioRef.current) setIsBuffering(true);
      };
      const error = () => {
        if (element === audioRef.current)
          failPlayback('This track is unavailable. Try another song.');
        else dispose(element);
      };
      element.addEventListener('timeupdate', time);
      element.addEventListener('pause', paused);
      element.addEventListener('loadedmetadata', metadata);
      element.addEventListener('ended', ended);
      element.addEventListener('playing', playing);
      element.addEventListener('waiting', waiting);
      element.addEventListener('error', error);
      return () => {
        element.removeEventListener('timeupdate', time);
        element.removeEventListener('pause', paused);
        element.removeEventListener('loadedmetadata', metadata);
        element.removeEventListener('ended', ended);
        element.removeEventListener('playing', playing);
        element.removeEventListener('waiting', waiting);
        element.removeEventListener('error', error);
        dispose(element);
      };
    });
    // Commands let dependency-specific effects reuse the same deck lifecycle.
    commands.current = { load, dispose, stopFade, play, prepare, configureAudio };
    const release = () => {
      stopFade();
      if (audioRef.current) persistResume(audioRef.current, true);
      elements.forEach(dispose);
    };
    window.addEventListener('pagehide', release);
    return () => {
      stopFade();
      cleanups.forEach((cleanup) => cleanup());
      window.removeEventListener('pagehide', release);
      commands.current = null;
      if (skipTimer.current) clearTimeout(skipTimer.current);
      graphNodes.forEach(({ source, compressor, gain }) => {
        source.disconnect();
        compressor.disconnect();
        gain.disconnect();
      });
      graphNodes.clear();
      void audioContext.current?.close().catch(() => {});
      audioContext.current = null;
    };
  }, []);

  const commands = useRef<{
    load: (element: HTMLAudioElement, url: string, prefetch: boolean) => void;
    dispose: (element: HTMLAudioElement) => void;
    stopFade: () => void;
    play: (element: HTMLAudioElement) => void;
    prepare: () => void;
    configureAudio: (element: HTMLAudioElement) => void;
  } | null>(null);
  useEffect(() => {
    const primary = audioRef.current;
    if (!primary || !commands.current) return;
    if (skipTimer.current) {
      clearTimeout(skipTimer.current);
      skipTimer.current = null;
    }
    if (!streamUrl || !isTrackAvailable(live.current.currentTrack)) {
      commands.current.dispose(primary);
      return;
    }
    if (promoted.current === streamUrl) {
      promoted.current = null;
      return;
    }
    commands.current.stopFade();
    if (incomingAudioRef.current) commands.current.dispose(incomingAudioRef.current);
    commands.current.load(primary, streamUrl, false);
    setDuration(0);
    setIsBuffering(false);
  }, [streamUrl, currentTrack?.id]);
  useEffect(() => {
    if (!commands.current) return;
    const incoming = incomingAudioRef.current;
    commands.current.stopFade();
    if (incoming) commands.current.dispose(incoming);
    const primary = audioRef.current;
    if (
      primary &&
      Number.isFinite(primary.duration) &&
      primary.duration - primary.currentTime <= 20 &&
      playback.isPlaying
    )
      commands.current.prepare();
  }, [
    queueKey,
    nextUrl,
    dataSaver,
    playback.repeat,
    playback.gapless,
    playback.crossfadeDuration,
    playback.isPlaying,
  ]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playback.isPlaying) {
      if (audio.src) commands.current?.play(audio);
    } else {
      audio.pause();
      incomingAudioRef.current?.pause();
    }
  }, [playback.isPlaying, playback.autoplayBlocked, streamUrl]);
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = (playback.isMuted ? 0 : playback.volume) * playback.sleepFade;
      audio.muted = playback.isMuted;
      audio.playbackRate = playbackSpeed;
    }
    if (incomingAudioRef.current) incomingAudioRef.current.playbackRate = playbackSpeed;
  }, [playback.volume, playback.isMuted, playback.sleepFade, playbackSpeed, streamUrl]);
  useEffect(() => {
    if (audioRef.current) commands.current?.configureAudio(audioRef.current);
    if (incomingAudioRef.current && playback.isCrossfading)
      commands.current?.configureAudio(incomingAudioRef.current);
  }, [playback.normalizeAudio, playback.isCrossfading, streamUrl, normalizationTargetLufs]);
  // Sources loaded later pick up the cap from `live`; re-cap the ones already playing (#590).
  const appliedCap = useRef(bitrateCap);
  useEffect(() => {
    if (appliedCap.current === bitrateCap) return;
    appliedCap.current = bitrateCap;
    for (const element of [audioRef.current, incomingAudioRef.current]) {
      if (element) sources.current.get(element)?.setMaxBitrate(bitrateCap);
    }
  }, [bitrateCap]);
  return {
    audioRef,
    incomingAudioRef,
    deckARef,
    deckBRef,
    duration,
    isBuffering,
    streamUrl,
    playbackSpeed,
    setPlaybackSpeed,
    streamQuality,
  };
}
