'use client';

import { memo, useState, type RefObject } from 'react';
import { AudioWaveform, Ellipsis, Heart, ListPlus, MessageSquare, Zap } from 'lucide-react';
import type { SleepTimer, SleepTimerOption } from '@/lib/sleepTimer';
import { SleepTimerMenu } from './SleepTimerMenu';
import { VolumeControl } from './VolumeControl';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export interface PlayerActionsProps {
  /** Whether the comment panel is open (drives `aria-expanded` on its trigger). */
  commentsExpanded: boolean;
  /** DOM id of the comment panel, referenced by `aria-controls`. */
  commentsPanelId: string;
  /** Ref to the Comments button so focus can return to it when the panel closes. */
  commentsTriggerRef: RefObject<HTMLButtonElement | null>;
  normalizeAudio: boolean;
  gapless: boolean;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  onOpenComments: () => void;
  onNormalizeAudioChange: (enabled: boolean) => void;
  onGaplessChange: (enabled: boolean) => void;
  onPlaybackSpeedChange: (speed: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  /** Active sleep timer, if any (#589). */
  sleepTimer: SleepTimer | null;
  onSelectSleepTimer: (option: SleepTimerOption) => void;
  onCancelSleepTimer: () => void;
  /** Human-readable streaming quality, shown in the More menu (#590). */
  streamQuality: string;
}

const toggleClass = (active: boolean) =>
  `hover:text-gray-300 cursor-pointer text-white ${active ? 'text-pink-500' : ''}`;

/** Right-hand player controls: track actions, audio toggles, speed (#336) and volume. */
export const PlayerActions = memo(function PlayerActions({
  commentsExpanded,
  commentsPanelId,
  commentsTriggerRef,
  normalizeAudio,
  gapless,
  playbackSpeed,
  volume,
  isMuted,
  onOpenComments,
  onNormalizeAudioChange,
  onGaplessChange,
  onPlaybackSpeedChange,
  onVolumeChange,
  onToggleMute,
  sleepTimer,
  onSelectSleepTimer,
  onCancelSleepTimer,
  streamQuality,
}: PlayerActionsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <div className="flex items-center border-l-2 pl-4 gap-4 relative">
      <button
        ref={commentsTriggerRef}
        aria-controls={commentsPanelId}
        aria-expanded={commentsExpanded}
        aria-haspopup="dialog"
        aria-label="Comments"
        className="hover:text-gray-300 cursor-pointer text-white"
        onClick={onOpenComments}
      >
        <MessageSquare size={16} />
      </button>
      <button
        aria-label="Add to playlist"
        className="hover:text-gray-300 cursor-pointer text-white"
      >
        <ListPlus size={16} />
      </button>
      <button aria-label="Like" className="hover:text-gray-300 font-bold cursor-pointer text-white">
        <Heart size={16} />
      </button>
      <button
        aria-label={normalizeAudio ? 'Disable audio normalization' : 'Enable audio normalization'}
        aria-pressed={normalizeAudio}
        className={toggleClass(normalizeAudio)}
        title={normalizeAudio ? 'Audio normalization on' : 'Audio normalization off'}
        onClick={() => onNormalizeAudioChange(!normalizeAudio)}
      >
        <AudioWaveform size={16} />
      </button>
      <button
        aria-label={gapless ? 'Disable gapless playback' : 'Enable gapless playback'}
        aria-pressed={gapless}
        className={toggleClass(gapless)}
        title={gapless ? 'Gapless playback on' : 'Gapless playback off'}
        onClick={() => onGaplessChange(!gapless)}
      >
        <Zap size={16} />
      </button>
      <button
        aria-expanded={showMoreMenu}
        aria-haspopup="true"
        aria-label="More options"
        className={
          sleepTimer
            ? 'hover:text-gray-300 cursor-pointer text-pink-500'
            : 'hover:text-gray-300 cursor-pointer text-white'
        }
        onClick={() => setShowMoreMenu(!showMoreMenu)}
      >
        <Ellipsis size={16} />
      </button>
      {showMoreMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
          <div className="absolute bottom-full right-0 mb-2 p-3 w-60 space-y-4 rounded-lg bg-[#161616] border border-gray-700 shadow-xl z-50">
            <p className="text-xs text-gray-400">
              Streaming: <span className="text-white">{streamQuality}</span>
            </p>
            <SleepTimerMenu
              sleepTimer={sleepTimer}
              onCancel={onCancelSleepTimer}
              onSelect={(option) => {
                onSelectSleepTimer(option);
                setShowMoreMenu(false);
              }}
            />
          </div>
        </>
      )}
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
              {PLAYBACK_SPEEDS.map((speed) => (
                <button
                  key={speed}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 ${
                    playbackSpeed === speed ? 'text-[#D2045B] font-bold' : 'text-white'
                  }`}
                  onClick={() => {
                    onPlaybackSpeedChange(speed);
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
      <VolumeControl
        isMuted={isMuted}
        volume={volume}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
      />
    </div>
  );
});
