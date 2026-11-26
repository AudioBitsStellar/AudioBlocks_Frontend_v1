'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, ExternalLink, Volume2, VolumeX } from 'lucide-react';

interface EmbedPlayerProps {
  id: string;
  title: string;
  artist: string;
  cover: string;
  streamUrl: string;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function EmbedPlayer({
  id,
  title,
  artist,
  cover,
  streamUrl,
}: EmbedPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('Playback prevented:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !muted;
    setMuted(!muted);
  };

  return (
    <div className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-5 shadow-2xl text-white font-sans">
      <audio
        ref={audioRef}
        src={streamUrl}
        preload="metadata"
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-neutral-800 border border-white/10 shadow">
          <Image
            src={cover || '/AFRO.jpg'}
            alt={title}
            fill
            unoptimized
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white truncate" title={title}>
            {title}
          </h2>
          <p className="text-xs text-gray-400 truncate mt-0.5" title={artist}>
            {artist}
          </p>
        </div>

        <Link
          href={`/dashboard?song=${encodeURIComponent(id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-gray-200 transition shrink-0"
          title="Open in AudioBlocks"
        >
          <span>Open</span>
          <ExternalLink size={12} />
        </Link>
      </div>

      {/* Progress & Scrub */}
      <div className="space-y-1 mb-4">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek track"
            className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#D2045B]"
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="p-2 rounded-full text-gray-400 hover:text-white transition"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#D2045B] hover:bg-[#b80348] text-white shadow-lg transition transform active:scale-95"
        >
          {isPlaying ? (
            <Pause size={20} className="fill-white" />
          ) : (
            <Play size={20} className="fill-white ml-0.5" />
          )}
        </button>

        <div className="text-[11px] text-gray-500 font-medium tracking-wide">
          AudioBlocks
        </div>
      </div>
    </div>
  );
}
