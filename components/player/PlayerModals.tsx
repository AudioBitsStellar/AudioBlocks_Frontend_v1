'use client';

import { type RefObject } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { FullScreenPlayer } from '@/components/common/FullScreenPlayer';
import type { SleepTimer, SleepTimerOption } from '@/lib/sleepTimer';

const CommentPanel = dynamic(() => import('@/components/common/dashboard/Comment'), {
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

interface PlayerModalsProps {
  showComments: boolean;
  commentPanelId: string;
  trackId: string;
  onCloseComments: () => void;
  isFullScreen: boolean;
  onCloseFullScreen: () => void;
  currentTrack?: { title?: string; artist?: string };
  audioRef: RefObject<HTMLAudioElement | null>;
  streamUrl: string;
  coverSrc: string;
  duration: number;
  sleepTimer?: SleepTimer | null;
  onCancelSleepTimer: () => void;
  onSelectSleepTimer: (minutes: SleepTimerOption) => void;
}

export function PlayerModals({
  showComments,
  commentPanelId,
  trackId,
  onCloseComments,
  isFullScreen,
  onCloseFullScreen,
  currentTrack,
  audioRef,
  streamUrl,
  coverSrc,
  duration,
  sleepTimer,
  onCancelSleepTimer,
  onSelectSleepTimer,
}: PlayerModalsProps) {
  return (
    <>
      {showComments && (
        <CommentPanel id={commentPanelId} trackId={trackId} onClose={onCloseComments} />
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
            title={currentTrack?.title}
            trackKey={trackId}
            onCancelSleepTimer={onCancelSleepTimer}
            onClose={onCloseFullScreen}
            onSelectSleepTimer={onSelectSleepTimer}
          />
        )}
      </AnimatePresence>
    </>
  );
}
