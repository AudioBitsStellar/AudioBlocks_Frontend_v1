'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  AlertCircle,
  Dot,
  Ellipsis,
  Heart,
  ListPlus,
  Loader2,
  MessageSquare,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { usePlayback } from '@/context/PlaybackContext';

// Lazy-load CommentPanel to reduce initial bundle size
const CommentPanel = dynamic(() => import('./dashboard/Comment'), {
  loading: () => <div className="fixed bottom-0 right-0 bg-[#1e1e1e] w-80 h-20 flex items-center justify-center text-gray-400">Loading comments...</div>,
  ssr: false,
});

const COVER_FALLBACK = '/placeholder-cover.svg';

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

/**
 * Renders the scrubber and drives it from a requestAnimationFrame loop instead
 * of React state, so playback position updates at display refresh rate without
 * re-rendering the rest of the player on every tick.
 */
const ProgressBar = memo(function ProgressBar({
  audioRef,
  duration,
  isPlaying,
  resetKey,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  duration: number;
  isPlaying: boolean;
  resetKey: string;
}) {
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const currentTimeRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const paint = useCallback((time: number) => {
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
  }, [duration]);

  // Reset the scrubber to 0 whenever the track changes.
  useEffect(() => {
    paint(0);
  }, [resetKey, paint]);

  useEffect(() => {
    if (!isPlaying) {
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
  }, [isPlaying, audioRef, paint]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    paint(newTime);
  }, [audioRef, paint]);

  return (
    <div className="flex items-center gap-2">
      <span ref={currentTimeRef} className="text-xs text-white w-8">0:00</span>
      <input
        ref={rangeRef}
        type="range"
        min={0}
        max={duration}
        step={1}
        defaultValue={0}
        role="slider"
        aria-label="Track position"
        aria-valuemin={0}
        aria-valuemax={duration}
        onChange={handleSeek}
        className="w-full h-1 bg-gray-600 rounded appearance-none cursor-pointer accent-[#D2045B]"
      />
      <span className="text-xs text-white w-8 text-right">{formatTime(duration)}</span>
    </div>
  );
});

const Player = () => {

  const {
    playlist,
    currentIndex,
    isPlaying,
    volume,
    isMuted,
    shuffle,
    repeat,
    trackError,
    autoplayBlocked,
    crossfadeDuration,
    isCrossfading,
    play,
    pause,
    next,
    prev,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setError,
    dismissError,
    addToRecentlyPlayed,
    setAutoplayBlocked,
    resumeAudio,
    setCrossfading,
  } = usePlayback();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const outgoingGainRef = useRef<GainNode | null>(null);
  const incomingGainRef = useRef<GainNode | null>(null);
  const outgoingSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const incomingSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const crossfadeRafRef = useRef<number | null>(null);
  const crossfadeActiveRef = useRef(false);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [duration, setDuration] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [trackAnnouncement, setTrackAnnouncement] = useState('');
  const [incomingUrl, setIncomingUrl] = useState<string | null>(null);

  const currentTrack = playlist[currentIndex];
  const trackId = currentTrack?.id || `track-${currentIndex}`;

  const resolveStreamUrl = useCallback((track: typeof currentTrack, index: number) => {
    if (!track) return '';
    const id = track.id || `track-${index}`;
    return track.url ? track.url : `${process.env.NEXT_PUBLIC_API_URL}/stream/${id}`;
  }, []);

  const streamUrl = useMemo(
    () => resolveStreamUrl(currentTrack, currentIndex),
    [currentTrack, currentIndex, resolveStreamUrl],
  );

  const resolveNextIndex = useCallback(() => {
    if (playlist.length === 0) return -1;
    if (shuffle) return Math.floor(Math.random() * playlist.length);
    return (currentIndex + 1) % playlist.length;
  }, [playlist.length, shuffle, currentIndex]);

  const ensureAudioGraph = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    return audioCtxRef.current;
  }, []);

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

    try {
      incomingSourceRef.current?.disconnect();
    } catch {
      // already disconnected
    }
    try {
      incomingGainRef.current?.disconnect();
    } catch {
      // already disconnected
    }
    incomingSourceRef.current = null;
    incomingGainRef.current = null;
    setIncomingUrl(null);
  }, [setCrossfading]);

  const finishCrossfade = useCallback(() => {
    const primary = audioRef.current;
    const incoming = incomingAudioRef.current;
    if (primary && incoming && incoming.src) {
      // Swap: primary takes over the incoming stream position/volume
      const incomingTime = incoming.currentTime;
      primary.src = incoming.src;
      primary.currentTime = incomingTime;
      primary.volume = isMuted ? 0 : volume;
      if (isPlaying) {
        void primary.play().catch(() => {
          /* handled by autoplay / error paths */
        });
      }
    }
    cleanupIncoming();
  }, [cleanupIncoming, isMuted, volume, isPlaying]);

  const startCrossfade = useCallback(async () => {
    if (crossfadeActiveRef.current || crossfadeDuration <= 0 || repeat) return;
    const primary = audioRef.current;
    if (!primary || !Number.isFinite(primary.duration) || primary.duration <= 0) return;

    const nextIdx = resolveNextIndex();
    if (nextIdx < 0 || nextIdx === currentIndex) return;
    const nextTrack = playlist[nextIdx];
    if (!nextTrack) return;

    const nextUrl = resolveStreamUrl(nextTrack, nextIdx);
    if (!nextUrl) return;

    crossfadeActiveRef.current = true;
    setCrossfading(true);
    setIncomingUrl(nextUrl);

    // Wait a tick so the incoming <audio> mounts with the new src
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const incoming = incomingAudioRef.current;
    if (!incoming) {
      cleanupIncoming();
      return;
    }

    incoming.volume = 0;
    incoming.muted = isMuted;

    try {
      await incoming.play();
    } catch {
      cleanupIncoming();
      return;
    }

    const ctx = ensureAudioGraph();
    const durationMs = crossfadeDuration * 1000;
    const start = performance.now();

    // Prefer Web Audio gain nodes when available; fall back to element.volume envelopes.
    if (ctx) {
      try {
        if (ctx.state === 'suspended') await ctx.resume();

        if (!outgoingSourceRef.current && primary) {
          outgoingSourceRef.current = ctx.createMediaElementSource(primary);
          outgoingGainRef.current = ctx.createGain();
          outgoingSourceRef.current.connect(outgoingGainRef.current);
          outgoingGainRef.current.connect(ctx.destination);
          outgoingGainRef.current.gain.value = isMuted ? 0 : volume;
        }

        incomingSourceRef.current = ctx.createMediaElementSource(incoming);
        incomingGainRef.current = ctx.createGain();
        incomingSourceRef.current.connect(incomingGainRef.current);
        incomingGainRef.current.connect(ctx.destination);
        incomingGainRef.current.gain.value = 0;
      } catch {
        // createMediaElementSource can only be called once per element — fall back to volume
      }
    }

    const tick = (now: number) => {
      if (!crossfadeActiveRef.current) return;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const outVol = (isMuted ? 0 : volume) * (1 - t);
      const inVol = (isMuted ? 0 : volume) * t;

      if (outgoingGainRef.current && incomingGainRef.current) {
        outgoingGainRef.current.gain.value = outVol;
        incomingGainRef.current.gain.value = inVol;
      } else {
        if (primary) primary.volume = outVol;
        if (incoming) incoming.volume = inVol;
      }

      if (t < 1 && isPlaying) {
        crossfadeRafRef.current = requestAnimationFrame(tick);
      } else if (t >= 1) {
        // Advance playlist to the next track and finalize the handoff
        next();
        finishCrossfade();
      } else {
        // Paused mid-crossfade — leave both elements paused at current envelope
        primary?.pause();
        incoming?.pause();
      }
    };

    crossfadeRafRef.current = requestAnimationFrame(tick);
  }, [
    crossfadeDuration,
    repeat,
    resolveNextIndex,
    currentIndex,
    playlist,
    resolveStreamUrl,
    setCrossfading,
    isMuted,
    cleanupIncoming,
    ensureAudioGraph,
    volume,
    isPlaying,
    next,
    finishCrossfade,
  ]);

  useEffect(() => {
    setCoverFailed(false);
    setIsBuffering(false);
    // Add to recently played when track changes
    if (currentTrack) {
      addToRecentlyPlayed(currentTrack);
    }
    // Abort any in-flight crossfade when the track changes externally
    if (crossfadeActiveRef.current) {
      cleanupIncoming();
    }
  }, [currentIndex, currentTrack, addToRecentlyPlayed, cleanupIncoming]);

  // Sync play/pause with the audio element; currentIndex triggers re-sync on track change
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
      // Resume incoming element if we paused mid-crossfade
      if (crossfadeActiveRef.current && incomingAudioRef.current) {
        void incomingAudioRef.current.play().catch(() => {});
      }
    } else {
      audio.pause();
      incomingAudioRef.current?.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Don't clobber volume envelopes mid-crossfade
    if (crossfadeActiveRef.current) {
      if (outgoingGainRef.current) {
        // gain nodes handle mute/volume via the envelope loop on next frame
      }
      return;
    }
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
    if (outgoingGainRef.current) {
      outgoingGainRef.current.gain.value = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Watch primary audio position and kick off crossfade near the end
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
  }, [isPlaying, crossfadeDuration, repeat, currentIndex, startCrossfade]);

  // Stop playback and release the audio resource when the tab is closed or the
  // user navigates to an external URL, so streaming doesn't continue orphaned.
  useEffect(() => {
    const releaseAudio = () => {
      cleanupIncoming();
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      audio.src = '';
      audio.load();
      try {
        outgoingSourceRef.current?.disconnect();
        outgoingGainRef.current?.disconnect();
      } catch {
        // ignore
      }
      outgoingSourceRef.current = null;
      outgoingGainRef.current = null;
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
    window.addEventListener('beforeunload', releaseAudio);
    window.addEventListener('pagehide', releaseAudio);
    return () => {
      window.removeEventListener('beforeunload', releaseAudio);
      window.removeEventListener('pagehide', releaseAudio);
      releaseAudio();
    };
  }, [cleanupIncoming]);

  useEffect(() => {
    if (currentTrack) {
      setTrackAnnouncement(`Now playing: ${currentTrack.title} by ${currentTrack.artist}`);
    }
  }, [currentIndex, currentTrack]);

  useEffect(() => {
    if (!autoplayBlocked) return;
    const handler = () => {
      resumeAudio();
      setAutoplayBlocked(false);
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [autoplayBlocked, resumeAudio, setAutoplayBlocked]);

  useEffect(() => {
    return () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isBuffering) return;
    if (isPlaying) pause();
    else play();
  }, [isBuffering, isPlaying, pause, play]);

  const handleAudioError = useCallback(() => {
    if (crossfadeActiveRef.current) {
      cleanupIncoming();
    }
    const errorMessage = currentTrack?.id
      ? `Unable to stream track "${currentTrack?.title}". The track may be unavailable or the ID is invalid.`
      : `Unable to load "${currentTrack?.title ?? 'track'}". Skipping to next track…`;
    setError(errorMessage);
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    skipTimerRef.current = setTimeout(() => next(), 3000);
  }, [currentTrack, setError, next, cleanupIncoming]);

  const coverSrc = useMemo(() => coverFailed || !currentTrack?.cover ? COVER_FALLBACK : currentTrack.cover, [coverFailed, currentTrack]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-elevated px-8 py-3 shadow-lg z-50">
      {trackError && (
        <div className="flex items-center justify-between bg-red-900/80 text-white text-xs px-4 py-2 rounded-md mb-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{trackError}</span>
          </div>
          <button
            onClick={dismissError}
            aria-label="Dismiss error"
            className="ml-4 hover:opacity-70 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {autoplayBlocked && (
        <div className="flex items-center justify-between bg-yellow-900/80 text-white text-xs px-4 py-2 rounded-md mb-2 max-w-7xl mx-auto cursor-pointer" role="button" tabIndex={0} onClick={() => { resumeAudio(); setAutoplayBlocked(false); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resumeAudio(); setAutoplayBlocked(false); } }}>
          <div className="flex items-center gap-2">
            <span className="text-yellow-300 font-bold mr-1" aria-hidden="true">🎵</span>
            <span>Click anywhere to start playback</span>
          </div>
          <span className="text-yellow-300 text-xs underline">Tap to play</span>
        </div>
      )}

      {/* aria-live region for track change announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {trackAnnouncement}
      </div>

      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        {/* Left Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShuffle}
            aria-label="Toggle shuffle"
            className={`hover:text-gray-300 cursor-pointer text-white ${shuffle ? 'text-pink-500' : ''}`}
          >
            <Shuffle size={16} />
          </button>
          <button onClick={prev} aria-label="Previous track" className="hover:text-gray-300 cursor-pointer text-white">
            <SkipBack size={16} />
          </button>
          <button
            onClick={handleTogglePlay}
            aria-label={isBuffering ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
            disabled={isBuffering}
            className="p-2 rounded-full bg-white flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 justify-center"
          >
            {isBuffering ? (
              <Loader2 size={14} className="text-gray-800 animate-spin" />
            ) : isPlaying ? (
              <FaPause size={14} className="text-gray-800" />
            ) : (
              <FaPlay size={14} className="text-gray-800" />
            )}
          </button>
          <button onClick={next} aria-label="Next track" className="hover:text-gray-300 text-white">
            <SkipForward size={15} />
          </button>
          <button
            onClick={toggleRepeat}
            aria-label="Toggle repeat"
            className={`hover:text-gray-300 text-white ${repeat ? 'text-pink-500' : ''}`}
          >
            <Repeat size={16} />
          </button>
        </div>

        {/* Cover art with fallback */}
        <div className="h-12 w-12 relative shrink-0">
          <Image
            src={coverSrc}
            alt={currentTrack?.title ?? 'Now playing'}
            fill
            className="rounded-md object-cover"
            onError={() => setCoverFailed(true)}
          />
        </div>

        {/* Scrubber + track info */}
        <div className="flex items-center gap-4 w-2/5">
          <div className="flex-1">
            <div className="flex items-center justify-center mb-3">
              <div className="text-white font-medium mr-4 text-sm truncate">
                {currentTrack?.title}
              </div>
              <div className="text-gray-400 flex items-center text-xs truncate">
                <Dot size={20} className="mr-4 text-white" />
                {currentTrack?.artist}
              </div>
            </div>
            <ProgressBar
              audioRef={audioRef}
              duration={duration}
              isPlaying={isPlaying}
              resetKey={trackId}
            />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center border-l-2 pl-4 gap-4 relative">
          <button
            className="hover:text-gray-300 cursor-pointer text-white"
            onClick={() => setShowComments(true)}
            aria-label="Comments"
          >
            <MessageSquare size={16} />
          </button>
          <button className="hover:text-gray-300 cursor-pointer text-white" aria-label="Add to playlist">
            <ListPlus size={16} />
          </button>
          <button className="hover:text-gray-300 font-bold cursor-pointer text-white" aria-label="Like">
            <Heart size={16} />
          </button>
          <button className="hover:text-gray-300 cursor-pointer text-white" aria-label="More options">
            <Ellipsis size={16} />
          </button>
          <div className="relative group flex items-center justify-center">
            <button
              className="hover:text-gray-300 text-white"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
            </button>
            <div className="absolute bottom-16 p-4 rounded-md bg-[#161616] rotate-[-90deg] items-center justify-center hidden group-hover:flex group-focus-within:flex">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                role="slider"
                aria-label="Volume"
                aria-valuemin={0}
                aria-valuemax={1}
                aria-valuenow={isMuted ? 0 : volume}
                aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)}%`}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 h-1 bg-gray-300 rounded appearance-none cursor-pointer accent-[#D2045B]"
              />
            </div>
          </div>
        </div>

        {/* Primary audio element — key forces remount on track change so new src loads cleanly */}
        <audio
          key={streamUrl}
          ref={audioRef}
          src={streamUrl}
          onEnded={() => {
            if (crossfadeActiveRef.current) {
              finishCrossfade();
              return;
            }
            if (repeat) audioRef.current?.play();
            else next();
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
          }}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onPlaying={() => setIsBuffering(false)}
          onError={handleAudioError}
        />
        {/* Incoming audio element used during crossfade (#115) */}
        {incomingUrl && (
          <audio
            ref={incomingAudioRef}
            src={incomingUrl}
            preload="auto"
            aria-hidden="true"
            onError={() => {
              cleanupIncoming();
            }}
          />
        )}
        {/* Expose crossfade state for tests / a11y tooling */}
        <span data-crossfading={isCrossfading ? 'true' : 'false'} className="sr-only" />
      </div>

      {showComments && (
        <CommentPanel onClose={() => setShowComments(false)} trackId={trackId} />
      )}
    </div>
  );
};

export default memo(Player);
