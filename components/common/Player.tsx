'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NowPlayingInfo } from '@/components/player/NowPlayingInfo';
import { PlaybackAlerts } from '@/components/player/PlaybackAlerts';
import { PlayerActions } from '@/components/player/PlayerActions';
import { PlayerControls } from '@/components/player/PlayerControls';
import { PlayerDecks } from '@/components/player/PlayerDecks';
import { PlayerModals } from '@/components/player/PlayerModals';
import { ProgressBar } from '@/components/player/ProgressBar';
import { usePlayerMediaSession } from '@/components/player/usePlayerMediaSession';
import { usePlayback } from '@/context/PlaybackContext';
import { useQueuedAudio } from '@/hooks/useQueuedAudio';

const COVER_FALLBACK = '/placeholder-cover.svg';
const COMMENT_PANEL_ID = 'comment-panel';

/**
 * Main Player Component — a composition layer (#602, #173). Playback runs in
 * `hooks/useQueuedAudio.ts`, which owns the two audio decks and HLS sources;
 * UI pieces live in `components/player/`.
 */
const Player = () => {
  const playback = usePlayback();
  const {
    playlist,
    currentIndex,
    isPlaying,
    trackError,
    autoplayBlocked,
    isCrossfading,
    play,
    pause,
    next,
    prev,
    dismissError,
    resumeAudio,
    addToRecentlyPlayed,
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const commentsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeComments = useCallback(() => {
    setShowComments(false);
    commentsTriggerRef.current?.focus();
  }, []);
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

  usePlayerMediaSession({
    audioRef,
    currentTrack,
    duration,
    isBuffering,
    isPlaying,
    next,
    pause,
    play,
    prev,
  });

  const coverSrc = useMemo(
    () => (coverFailed || !currentTrack?.cover ? COVER_FALLBACK : currentTrack.cover),
    [coverFailed, currentTrack]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-elevated px-8 py-3 shadow-lg z-50">
      <PlaybackAlerts
        autoplayBlocked={autoplayBlocked}
        trackError={trackError}
        onDismissError={dismissError}
        onUnlockAutoplay={unlockAutoplay}
      />

      {/* aria-live region for track change announcements */}
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {trackAnnouncement}
      </div>

      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <PlayerControls
          isBuffering={isBuffering}
          isPlaying={isPlaying}
          repeat={playback.repeat}
          shuffle={playback.shuffle}
          onNext={next}
          onPrev={prev}
          onTogglePlay={handleTogglePlay}
          onToggleRepeat={playback.toggleRepeat}
          onToggleShuffle={playback.toggleShuffle}
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
          gapless={playback.gapless}
          isMuted={playback.isMuted}
          normalizeAudio={playback.normalizeAudio}
          playbackSpeed={playbackSpeed}
          sleepTimer={playback.sleepTimer}
          streamQuality={streamQuality}
          volume={playback.volume}
          onCancelSleepTimer={playback.cancelSleepTimer}
          onGaplessChange={playback.setGapless}
          onNormalizeAudioChange={playback.setNormalizeAudio}
          onOpenComments={() => setShowComments(true)}
          onPlaybackSpeedChange={setPlaybackSpeed}
          onSelectSleepTimer={playback.setSleepTimer}
          onToggleMute={playback.toggleMute}
          onVolumeChange={playback.setVolume}
        />

        <PlayerDecks deckARef={deckARef} deckBRef={deckBRef} isCrossfading={isCrossfading} />
      </div>

      <PlayerModals
        audioRef={audioRef}
        commentPanelId={COMMENT_PANEL_ID}
        coverSrc={coverSrc}
        currentTrack={currentTrack}
        duration={duration}
        isFullScreen={isFullScreen}
        showComments={showComments}
        sleepTimer={playback.sleepTimer}
        streamUrl={streamUrl}
        trackId={trackId}
        onCancelSleepTimer={playback.cancelSleepTimer}
        onCloseComments={closeComments}
        onCloseFullScreen={() => setIsFullScreen(false)}
        onSelectSleepTimer={playback.setSleepTimer}
      />
    </div>
  );
};

export default memo(Player);
