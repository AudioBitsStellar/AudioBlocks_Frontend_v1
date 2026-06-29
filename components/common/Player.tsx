'use client';

import { useEffect, useRef, useState } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  AlertCircle,
  Dot,
  Ellipsis,
  Heart,
  ListPlus,
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

export default function Player() {
  const {
    playlist,
    currentIndex,
    isPlaying,
    volume,
    isMuted,
    shuffle,
    repeat,
    trackError,
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
  } = usePlayback();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const currentTrack = playlist[currentIndex];
  const trackId = currentTrack?.id || `track-${currentIndex}`;
  
  // Build stream URL from backend endpoint
  const streamUrl = currentTrack?.url 
    ? currentTrack.url 
    : `${process.env.NEXT_PUBLIC_API_URL}/stream/${trackId}`;

  useEffect(() => {
    setCoverFailed(false);
    setProgress(0);
    // Add to recently played when track changes
    if (currentTrack) {
      addToRecentlyPlayed(currentTrack);
    }
  }, [currentIndex, currentTrack, addToRecentlyPlayed]);

  // Sync play/pause with the audio element; currentIndex triggers re-sync on track change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {
        setError(`Unable to load "${currentTrack?.title ?? 'track'}". Skipping to next track…`);
      });
    } else {
      audio.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && isPlaying) {
        setProgress(audioRef.current.currentTime);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) pause();
    else play();
  };

  const handleAudioError = () => {
    const errorMessage = currentTrack?.id 
      ? `Unable to stream track "${currentTrack?.title}". The track may be unavailable or the ID is invalid.`
      : `Unable to load "${currentTrack?.title ?? 'track'}". Skipping to next track…`;
    setError(errorMessage);
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    skipTimerRef.current = setTimeout(() => next(), 3000);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const coverSrc = coverFailed || !currentTrack?.cover ? COVER_FALLBACK : currentTrack.cover;

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
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="p-2 rounded-full bg-white flex items-center cursor-pointer justify-center"
          >
            {isPlaying ? (
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
            <div className="flex items-center gap-2">
              <span className="text-xs text-white w-8">{formatTime(progress)}</span>
              <input
                type="range"
                min={0}
                max={duration}
                step={1}
                value={progress}
                onChange={(e) => {
                  const newTime = Number(e.target.value);
                  if (audioRef.current) {
                    audioRef.current.currentTime = newTime;
                    setProgress(newTime);
                  }
                }}
                className="w-full h-1 bg-gray-600 rounded appearance-none cursor-pointer accent-[#D2045B]"
                style={{
                  background: `linear-gradient(to right, #B6195B 0%, #B6195B ${
                    duration ? (progress / duration) * 100 : 0
                  }%, rgb(82,82,82) ${
                    duration ? (progress / duration) * 100 : 0
                  }%, rgb(82,82,82) 100%)`,
                }}
              />
              <span className="text-xs text-white w-8 text-right">{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center border-l-2 pl-4 gap-4 relative">
          <button
            className="hover:text-gray-300 cursor-pointer text-white"
            onClick={() => setShowComments(true)}
          >
            <MessageSquare size={16} />
          </button>
          <button className="hover:text-gray-300 cursor-pointer text-white">
            <ListPlus size={16} />
          </button>
          <button className="hover:text-gray-300 font-bold cursor-pointer text-white">
            <Heart size={16} />
          </button>
          <button className="hover:text-gray-300 cursor-pointer text-white">
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
            <div className="absolute bottom-16 p-4 rounded-md bg-[#161616] rotate-[-90deg] items-center justify-center hidden group-hover:flex">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 h-1 bg-gray-300 rounded appearance-none cursor-pointer accent-[#D2045B]"
              />
            </div>
          </div>
        </div>

        {/* Audio element — key forces remount on track change so new src loads cleanly */}
        <audio
          key={streamUrl}
          ref={audioRef}
          src={streamUrl}
          onEnded={() => {
            if (repeat) audioRef.current?.play();
            else next();
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            setProgress(0);
          }}
          onError={handleAudioError}
        />
      </div>

      {showComments && (
        <CommentPanel onClose={() => setShowComments(false)} trackId={trackId} />
      )}
    </div>
  );
}
