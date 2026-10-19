'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AudioWaveform,
  Dot,
  Ellipsis,
  Heart,
  ListPlus,
  Loader2,
  MessageSquare,
  Play,
  Pause,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { usePlayback } from '@/context/PlaybackContext';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useQueuedAudio } from '@/hooks/useQueuedAudio';
import { FullScreenPlayer } from './FullScreenPlayer';

// Lazy-load CommentPanel to reduce initial bundle size
const CommentPanel = dynamic(() => import('./dashboard/Comment'), {
  loading: () => (
    <div className="fixed bottom-0 right-0 bg-[#1e1e1e] w-80 h-20 flex items-center justify-center text-gray-400">
      Loading comments...
    </div>
  ),
  ssr: false,
});

const COVER_FALLBACK = '/placeholder-cover.svg';

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

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

  // Reset the scrubber to 0 whenever the track changes.
  useEffect(() => {
    paint(0);
  }, [resetKey, paint]);

  // Pause the position loop while scrubbing so the drag isn't fought by
  // playback-position updates.
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

  // Start scrubbing: duck the volume so the preview is audible but not
  // jarring, and remember the previous level to restore on release.
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

/**
 * Main Player Component (`components/common/Player.tsx`)
 *
 * Drives global audio playback, track scrub previewing, crossfade overlapping (#115),
 * gapless preloading (#329), audio loudness normalization (#328), and media session integration.
 *
 * @crossfade
 * Crossfade transitions overlap outgoing and incoming tracks when `crossfadeDuration` > 0.
 * Detailed crossfade architecture and configuration guides can be found in `docs/CROSSFADE.md`.
 */
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
    isCrossfading,
    normalizeAudio,
    gapless,
    play,
    pause,
    next,
    prev,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    dismissError,
    addToRecentlyPlayed,
    setAutoplayBlocked,
    resumeAudio,
    setNormalizeAudio,
    setGapless,
  } = usePlayback();

  const {
    audioRef,
    deckARef,
    deckBRef,
    duration,
    isBuffering,
    streamUrl,
    playbackSpeed,
    setPlaybackSpeed,
  } = useQueuedAudio();
  const [showComments, setShowComments] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const currentTrack = playlist[currentIndex];
  const trackId = currentTrack?.id || `track-${currentIndex}`;
  const trackAnnouncement = currentTrack
    ? `Now playing: ${currentTrack.title} by ${currentTrack.artist}`
    : '';
  useEffect(() => {
    setCoverFailed(false);
    if (currentTrack && isPlaying) addToRecentlyPlayed(currentTrack);
  }, [currentTrack, isPlaying, addToRecentlyPlayed]);
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) pause();
    else {
      resumeAudio();
      play();
    }
  }, [isPlaying, pause, play, resumeAudio]);
  useMediaSession({
    track: currentTrack
      ? { title: currentTrack.title, artist: currentTrack.artist, cover: currentTrack.cover }
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
  const coverSrc = useMemo(
    () => (coverFailed || !currentTrack?.cover ? COVER_FALLBACK : currentTrack.cover),
    [coverFailed, currentTrack]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-elevated px-8 py-3 shadow-lg z-50">
      {trackError && (
        <div className="flex items-center justify-between bg-red-900/80 text-white text-xs px-4 py-2 rounded-md mb-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <AlertCircle className="shrink-0" size={14} />
            <span>{trackError}</span>
          </div>
          <button
            aria-label="Dismiss error"
            className="ml-4 hover:opacity-70 shrink-0"
            onClick={dismissError}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {autoplayBlocked && (
        <div
          className="flex items-center justify-between bg-yellow-900/80 text-white text-xs px-4 py-2 rounded-md mb-2 max-w-7xl mx-auto cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => {
            resumeAudio();
            setAutoplayBlocked(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              resumeAudio();
              setAutoplayBlocked(false);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-yellow-300 font-bold mr-1">
              🎵
            </span>
            <span>Click anywhere to start playback</span>
          </div>
          <span className="text-yellow-300 text-xs underline">Tap to play</span>
        </div>
      )}

      {/* aria-live region for track change announcements */}
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {trackAnnouncement}
      </div>

      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        {/* Left Controls */}
        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle shuffle"
            className={`hover:text-gray-300 cursor-pointer text-white ${shuffle ? 'text-pink-500' : ''}`}
            onClick={toggleShuffle}
          >
            <Shuffle size={16} />
          </button>
          <button
            aria-label="Previous track"
            className="hover:text-gray-300 cursor-pointer text-white"
            onClick={prev}
          >
            <SkipBack size={16} />
          </button>
          <button
            aria-label={isBuffering ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
            className="p-2 rounded-full bg-white flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 justify-center"
            disabled={isBuffering}
            onClick={handleTogglePlay}
          >
            {isBuffering ? (
              <Loader2 className="text-gray-800 animate-spin" size={14} />
            ) : isPlaying ? (
              <Pause className="text-gray-800" size={14} />
            ) : (
              <Play className="text-gray-800" size={14} />
            )}
          </button>
          <button aria-label="Next track" className="hover:text-gray-300 text-white" onClick={next}>
            <SkipForward size={15} />
          </button>
          <button
            aria-label="Toggle repeat"
            className={`hover:text-gray-300 text-white ${repeat ? 'text-pink-500' : ''}`}
            onClick={toggleRepeat}
          >
            <Repeat size={16} />
          </button>
        </div>

        {/* Cover art with fallback */}
        <div className="h-12 w-12 relative shrink-0">
          <Image
            fill
            alt={currentTrack?.title ?? 'Now playing'}
            className="rounded-md object-cover"
            src={coverSrc}
            onError={() => setCoverFailed(true)}
          />
        </div>

        {/* Scrubber + track info */}
        <div className="flex items-center gap-4 w-2/5">
          <div className="flex-1 cursor-pointer" onClick={() => setIsFullScreen(true)}>
            <div className="flex items-center justify-center mb-3">
              <div className="text-white font-medium mr-4 text-sm truncate">
                {currentTrack?.title}
              </div>
              <div className="text-gray-400 flex items-center text-xs truncate">
                <Dot className="mr-4 text-white" size={20} />
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
            aria-label="Comments"
            className="hover:text-gray-300 cursor-pointer text-white"
            onClick={() => setShowComments(true)}
          >
            <MessageSquare size={16} />
          </button>
          <button
            aria-label="Add to playlist"
            className="hover:text-gray-300 cursor-pointer text-white"
          >
            <ListPlus size={16} />
          </button>
          <button
            aria-label="Like"
            className="hover:text-gray-300 font-bold cursor-pointer text-white"
          >
            <Heart size={16} />
          </button>
          <button
            aria-label={
              normalizeAudio ? 'Disable audio normalization' : 'Enable audio normalization'
            }
            aria-pressed={normalizeAudio}
            className={`hover:text-gray-300 cursor-pointer text-white ${normalizeAudio ? 'text-pink-500' : ''}`}
            title={normalizeAudio ? 'Audio normalization on' : 'Audio normalization off'}
            onClick={() => setNormalizeAudio(!normalizeAudio)}
          >
            <AudioWaveform size={16} />
          </button>
          <button
            aria-label={gapless ? 'Disable gapless playback' : 'Enable gapless playback'}
            aria-pressed={gapless}
            className={`hover:text-gray-300 cursor-pointer text-white ${gapless ? 'text-pink-500' : ''}`}
            title={gapless ? 'Gapless playback on' : 'Gapless playback off'}
            onClick={() => setGapless(!gapless)}
          >
            <Zap size={16} />
          </button>
          <button
            aria-label="More options"
            className="hover:text-gray-300 cursor-pointer text-white"
          >
            <Ellipsis size={16} />
          </button>
          {/* #336 — Playback speed control */}
          <div className="relative">
            <button
              aria-label={`Playback speed: ${playbackSpeed}x`}
              className="hover:text-gray-300 cursor-pointer text-white text-xs font-mono min-w-[2rem]"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            >
              {playbackSpeed}x
            </button>
            {showSpeedMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSpeedMenu(false)} />
                <div className="absolute bottom-full right-0 mb-2 py-1 rounded-lg bg-[#161616] border border-gray-700 shadow-xl z-50 min-w-[5rem]">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 ${
                        playbackSpeed === speed ? 'text-[#D2045B] font-bold' : 'text-white'
                      }`}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative group flex items-center justify-center">
            <button
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="hover:text-gray-300 text-white"
              onClick={toggleMute}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className="absolute bottom-16 p-4 rounded-md bg-[#161616] rotate-[-90deg] items-center justify-center hidden group-hover:flex group-focus-within:flex">
              <input
                aria-label="Volume"
                aria-valuemax={1}
                aria-valuemin={0}
                aria-valuenow={isMuted ? 0 : volume}
                aria-valuetext={`${Math.round((isMuted ? 0 : volume) * 100)}%`}
                className="w-24 h-1 bg-gray-300 rounded appearance-none cursor-pointer accent-[#D2045B]"
                max={1}
                min={0}
                role="slider"
                step={0.01}
                type="range"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Persistent decks are promoted with their HLS buffers intact. */}
        <audio ref={deckARef} aria-hidden="true" data-audio-deck="a" preload="none" />
        <audio ref={deckBRef} aria-hidden="true" data-audio-deck="b" preload="none" />
        {/* Expose crossfade state for tests / a11y tooling */}
        <span className="sr-only" data-crossfading={isCrossfading ? 'true' : 'false'} />
      </div>

      {showComments && <CommentPanel trackId={trackId} onClose={() => setShowComments(false)} />}
      <AnimatePresence>
        {isFullScreen && (
          <FullScreenPlayer
            artist={currentTrack?.artist}
            audioRef={audioRef}
            audioSrc={streamUrl}
            cover={coverSrc}
            duration={duration}
            title={currentTrack?.title}
            trackKey={trackId}
            onClose={() => setIsFullScreen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(Player);
