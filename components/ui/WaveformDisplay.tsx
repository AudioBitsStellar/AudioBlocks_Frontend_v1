'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

export interface WaveformDisplayProps {
  /** Array of normalized amplitude values between 0 and 1 */
  data?: number[];
  /** Current playback position in seconds */
  currentTime?: number;
  /** Total duration in seconds */
  duration?: number;
  /** Direct progress fraction between 0 and 1 */
  progress?: number;
  /** Callback fired when user seeks */
  onSeek?: (progress: number, seekTime?: number) => void;
  /** Accent color for played portion of waveform */
  playedColor?: string;
  /** Color for unplayed portion of waveform */
  unplayedColor?: string;
  /** Color of playhead position line */
  playheadColor?: string;
  /** Desired height in pixels (min 60, max 200, default 80) */
  height?: number;
  /** Width of each bar in pixels */
  barWidth?: number;
  /** Gap between bars in pixels */
  barGap?: number;
  /** Additional CSS class names */
  className?: string;
  /** Enable seek interaction (default true) */
  interactive?: boolean;
}

// Generate fallback synthetic waveform data if none provided
function generateFallbackData(count: number = 80): number[] {
  const data: number[] = [];
  for (let i = 0; i < count; i++) {
    const sin1 = Math.sin((i / count) * Math.PI * 4);
    const sin2 = Math.cos((i / count) * Math.PI * 8);
    const val = 0.25 + 0.35 * Math.abs(sin1) + 0.35 * Math.abs(sin2 * 0.5);
    data.push(Math.min(1, Math.max(0.1, val)));
  }
  return data;
}

export function WaveformDisplay({
  data,
  currentTime,
  duration,
  progress,
  onSeek,
  playedColor = '#885FA8',
  unplayedColor = 'rgba(255, 255, 255, 0.2)',
  playheadColor = '#FFFFFF',
  height = 80,
  barWidth = 3,
  barGap = 2,
  className = '',
  interactive = true,
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  // Clamp height between 60px and 200px
  const clampedHeight = useMemo(
    () => Math.max(60, Math.min(200, height)),
    [height]
  );

  // Determine actual waveform progress fraction [0, 1]
  const currentProgress = useMemo(() => {
    if (typeof progress === 'number') {
      return Math.max(0, Math.min(1, progress));
    }
    if (typeof currentTime === 'number' && typeof duration === 'number' && duration > 0) {
      return Math.max(0, Math.min(1, currentTime / duration));
    }
    return 0;
  }, [progress, currentTime, duration]);

  const rawAmplitudes = useMemo(() => {
    if (data && data.length > 0) return data;
    return generateFallbackData(80);
  }, [data]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const heightPx = clampedHeight;

    if (width === 0) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    canvas.width = width * dpr;
    canvas.height = heightPx * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${heightPx}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, heightPx);

    const slotWidth = barWidth + barGap;
    const numBars = Math.max(1, Math.floor((width + barGap) / slotWidth));

    // Resample amplitude data to match numBars
    const sampledAmplitudes: number[] = new Array(numBars);
    for (let i = 0; i < numBars; i++) {
      const startIdx = Math.floor((i / numBars) * rawAmplitudes.length);
      const endIdx = Math.max(startIdx + 1, Math.floor(((i + 1) / numBars) * rawAmplitudes.length));
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx && j < rawAmplitudes.length; j++) {
        sum += rawAmplitudes[j];
        count++;
      }
      sampledAmplitudes[i] = count > 0 ? sum / count : 0.1;
    }

    const playheadX = currentProgress * width;

    // Draw bars
    for (let i = 0; i < numBars; i++) {
      const x = i * slotWidth;
      const amp = sampledAmplitudes[i];
      const minBarHeight = 4;
      const maxBarHeight = heightPx - 12;
      const bHeight = Math.max(minBarHeight, amp * maxBarHeight);
      const y = (heightPx - bHeight) / 2;

      const barCenterX = x + barWidth / 2;
      const isPlayed = barCenterX <= playheadX;

      ctx.fillStyle = isPlayed ? playedColor : unplayedColor;

      // Draw rounded rectangle bar
      const radius = Math.min(barWidth / 2, bHeight / 2);
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, barWidth, bHeight, radius);
      } else {
        ctx.rect(x, y, barWidth, bHeight);
      }
      ctx.fill();
    }

    // Draw playhead vertical line
    ctx.beginPath();
    ctx.strokeStyle = playheadColor;
    ctx.lineWidth = 2;
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, heightPx);
    ctx.stroke();

    // Draw playhead top/bottom caps
    ctx.fillStyle = playheadColor;
    ctx.beginPath();
    ctx.arc(playheadX, 3, 3, 0, Math.PI * 2);
    ctx.arc(playheadX, heightPx - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [clampedHeight, barWidth, barGap, rawAmplitudes, currentProgress, playedColor, unplayedColor, playheadColor]);

  // Handle ResizeObserver & redraw
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;

    const handleResize = () => {
      animationFrameId = requestAnimationFrame(drawWaveform);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    drawWaveform();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [drawWaveform]);

  // Handle Seeking
  const calculateSeekProgress = (clientX: number): number => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return 0;
    const relX = clientX - rect.left;
    return Math.max(0, Math.min(1, relX / rect.width));
  };

  const triggerSeek = (newProgress: number) => {
    if (!onSeek) return;
    const seekTime = typeof duration === 'number' ? newProgress * duration : undefined;
    onSeek(newProgress, seekTime);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const newProgress = calculateSeekProgress(e.clientX);
    triggerSeek(newProgress);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !isDraggingRef.current) return;
    const newProgress = calculateSeekProgress(e.clientX);
    triggerSeek(newProgress);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !isDraggingRef.current) return;
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onSeek) return;
    let step = 0.05; // 5% seek
    let newProgress = currentProgress;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      newProgress = Math.max(0, currentProgress - step);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      newProgress = Math.min(1, currentProgress + step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      newProgress = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newProgress = 1;
    } else {
      return;
    }

    triggerSeek(newProgress);
  };

  const formattedTime = typeof currentTime === 'number'
    ? `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`
    : `${Math.round(currentProgress * 100)}%`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl bg-surface p-3 overflow-hidden select-none focus:outline-none focus:ring-2 focus:ring-brand ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        minHeight: '60px',
        maxHeight: '200px',
        height: `${clampedHeight}px`,
      }}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'slider' : 'img'}
      aria-label="Audio waveform playback position"
      aria-valuemin={0}
      aria-valuemax={duration ?? 100}
      aria-valuenow={typeof currentTime === 'number' ? Math.round(currentTime) : Math.round(currentProgress * 100)}
      aria-valuetext={`Playback position ${formattedTime}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

export default WaveformDisplay;
