'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { NowPlayingInfo } from '@/components/player/NowPlayingInfo';
import { PlayerActions } from '@/components/player/PlayerActions';
import { PlayerControls } from '@/components/player/PlayerControls';
import { ProgressBar } from '@/components/player/ProgressBar';
import { usePlayback } from '@/context/PlaybackContext';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useQueuedAudio } from '@/hooks/useQueuedAudio';
import { FullScreenPlayer } from './FullScreenPlayer';

// Lazy-load CommentPanel to reduce initial bundle size
const CommentPanel = dynamic(() => import('./dashboard/Comment'), {
  loading: () => (
    <div
      aria-live="polite"
      className="fixed bottom-0 right-0 bg-[#1e1e1e] w-80 h-20 flex items-center justify-center text-gray-400"
      role="status"
    >
      Loading comments...
    </div>
  ),
  ssr: false,
});

const COVER_FALLBACK = '/placeholder-cover.svg';
const COMMENT_PANEL_ID = 'comment-panel';

/**
 * Main Player Component — a composition layer (#602). Playback runs in
 * `hooks/useQueuedAudio.ts`, which owns the two audio decks and HLS sources;
 * UI pieces live in `components/player/`.
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
    sleepTimer,
    play,
    pause,
    next,
    prev,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    dismissError,
    resumeAudio,
    setNormalizeAudio,
    setGapless,
    addToRecentlyPlayed,
    setSleepTimer,
    cancelSleepTimer,
  } = playback;

  const {
    audioRef,
    deckARef,
    deckBRef,
    duration,
    isBuffering,
    streamUrl,
    playbackSpeed,
    setPlaybackSpeed,
    streamQuality,
  } = useQueuedAudio();
  const [showComments, setShowComments] = useState(false);
  const commentsTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Hand focus back to the trigger so keyboard users land where they were.
  const closeComments = useCallback(() => {
    setShowComments(false);
    commentsTriggerRef.current?.focus();
  }, []);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
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
  const unlockAutoplay = useCallback(() => {
    resumeAudio();
    play();
  }, [play, resumeAudio]);
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
          onTogglePlay={handleTogglePlay}
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
          commentsExpanded={showComments}
          commentsPanelId={COMMENT_PANEL_ID}
          commentsTriggerRef={commentsTriggerRef}
          gapless={gapless}
          isMuted={isMuted}
          normalizeAudio={normalizeAudio}
          playbackSpeed={playbackSpeed}
          sleepTimer={sleepTimer}
          streamQuality={streamQuality}
          volume={volume}
          onCancelSleepTimer={cancelSleepTimer}
          onGaplessChange={setGapless}
          onNormalizeAudioChange={setNormalizeAudio}
          onOpenComments={() => setShowComments(true)}
          onPlaybackSpeedChange={setPlaybackSpeed}
          onSelectSleepTimer={setSleepTimer}
          onToggleMute={toggleMute}
          onVolumeChange={setVolume}
        />

        {/* Persistent decks are promoted with their HLS buffers intact. */}
        <audio ref={deckARef} aria-hidden="true" data-audio-deck="a" preload="none" />
        <audio ref={deckBRef} aria-hidden="true" data-audio-deck="b" preload="none" />
        {/* Expose crossfade state for tests / a11y tooling */}
        <span className="sr-only" data-crossfading={isCrossfading ? 'true' : 'false'} />
      </div>

      {showComments && (
        <CommentPanel id={COMMENT_PANEL_ID} trackId={trackId} onClose={closeComments} />
      )}
      <AnimatePresence>
        {isFullScreen && (
          <FullScreenPlayer
            artist={currentTrack?.artist}
            audioRef={audioRef}
            audioSrc={streamUrl}
            cover={coverSrc}
            duration={duration}
            sleepTimer={sleepTimer}
            songId={currentTrack?.id}
            title={currentTrack?.title}
            trackKey={trackId}
            onCancelSleepTimer={cancelSleepTimer}
            onClose={() => setIsFullScreen(false)}
            onSelectSleepTimer={setSleepTimer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(Player);
