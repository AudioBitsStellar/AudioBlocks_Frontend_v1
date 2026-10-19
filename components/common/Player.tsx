'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { NowPlayingInfo } from '@/components/player/NowPlayingInfo';
import { PlayerActions } from '@/components/player/PlayerActions';
import { PlayerControls } from '@/components/player/PlayerControls';
import { ProgressBar } from '@/components/player/ProgressBar';
import { usePlayback } from '@/context/PlaybackContext';
import { useAudioEngine } from '@/hooks/player/useAudioEngine';
import { usePlayerKeyboard } from '@/hooks/player/usePlayerKeyboard';
import { useMediaSession } from '@/hooks/useMediaSession';
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

/**
 * Main Player Component — a composition layer (#602). Audio behavior lives in
 * `hooks/player/useAudioEngine.ts`; UI pieces live in `components/player/`.
 */
const Player = () => {
  const playback = usePlayback();
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
    setAutoplayBlocked,
    resumeAudio,
    setNormalizeAudio,
    setGapless,
  } = playback;

  const engine = useAudioEngine(playback);
  const { audioRef, streamUrl, duration, isBuffering } = engine;

  const [showComments, setShowComments] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const currentTrack = playlist[currentIndex];
  const trackId = currentTrack?.id || `track-${currentIndex}`;
  const trackAnnouncement = currentTrack
    ? `Now playing: ${currentTrack.title} by ${currentTrack.artist}`
    : '';

  const unlockAutoplay = useCallback(() => {
    resumeAudio();
    setAutoplayBlocked(false);
  }, [resumeAudio, setAutoplayBlocked]);

  usePlayerKeyboard({ autoplayBlocked, onUnlock: unlockAutoplay });

  // #331 — Media Session API integration
  useMediaSession({
    track: currentTrack
      ? { title: currentTrack.title, artist: currentTrack.artist, cover: currentTrack.cover }
      : null,
    isPlaying: isPlaying && !isBuffering,
    duration,
    currentTime: audioRef.current?.currentTime ?? 0,
    onPlay: play,
    onPause: pause,
    onSeekBackward: (offset) => {
      if (audioRef.current)
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - offset);
    },
    onSeekForward: (offset) => {
      if (audioRef.current)
        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + offset);
    },
    onPrevTrack: prev,
    onNextTrack: next,
    onSeekTo: (seekTime) => {
      if (audioRef.current) audioRef.current.currentTime = seekTime;
    },
  });

  useEffect(() => {
    setCoverFailed(false);
  }, [currentIndex, currentTrack]);

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
          onClick={unlockAutoplay}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              unlockAutoplay();
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
        <PlayerControls
          isBuffering={isBuffering}
          isPlaying={isPlaying}
          repeat={repeat}
          shuffle={shuffle}
          onNext={next}
          onPrev={prev}
          onTogglePlay={engine.togglePlay}
          onToggleRepeat={toggleRepeat}
          onToggleShuffle={toggleShuffle}
        />

        <NowPlayingInfo
          coverSrc={coverSrc}
          track={currentTrack}
          onCoverError={() => setCoverFailed(true)}
          onOpenFullScreen={() => setIsFullScreen(true)}
        >
          <ProgressBar
            audioRef={audioRef}
            duration={duration}
            isPlaying={isPlaying}
            resetKey={trackId}
          />
        </NowPlayingInfo>

        <PlayerActions
          gapless={gapless}
          isMuted={isMuted}
          normalizeAudio={normalizeAudio}
          playbackSpeed={engine.playbackSpeed}
          volume={volume}
          onGaplessChange={setGapless}
          onNormalizeAudioChange={setNormalizeAudio}
          onOpenComments={() => setShowComments(true)}
          onPlaybackSpeedChange={engine.setPlaybackSpeed}
          onToggleMute={toggleMute}
          onVolumeChange={setVolume}
        />

        {/* key remounts on track change so the new src loads cleanly; gapless mode (#329) keeps the element mounted and swaps src manually */}
        <audio
          key={gapless ? undefined : streamUrl}
          ref={audioRef}
          src={streamUrl}
          {...engine.primaryHandlers}
        />
        {/* Incoming audio element used during crossfade (#115) */}
        {engine.incomingUrl && (
          <audio
            ref={engine.incomingAudioRef}
            aria-hidden="true"
            preload="auto"
            src={engine.incomingUrl}
            {...engine.incomingHandlers}
          />
        )}
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
