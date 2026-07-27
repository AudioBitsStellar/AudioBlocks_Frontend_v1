'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

function formatTime(seconds: number, includeHours: boolean): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (includeHours || h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTimeInput(value: string, totalSeconds: number): number {
  const parts = value.split(':').map(Number);
  if (parts.some(isNaN)) return totalSeconds;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

export interface TimeRangePickerProps {
  duration: number;
  startTime: number;
  endTime: number;
  onChange: (startTime: number, endTime: number) => void;
  minRange?: number;
  className?: string;
}

export function TimeRangePicker({
  duration,
  startTime,
  endTime,
  onChange,
  minRange = 5,
  className,
}: TimeRangePickerProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const startThumbRef = React.useRef<HTMLButtonElement>(null);
  const endThumbRef = React.useRef<HTMLButtonElement>(null);
  const [activeThumb, setActiveThumb] = React.useState<'start' | 'end' | null>(null);
  const [editing, setEditing] = React.useState<'start' | 'end' | null>(null);
  const [editValue, setEditValue] = React.useState('');

  const clampedStart = React.useMemo(
    () => Math.max(0, Math.min(startTime, duration)),
    [startTime, duration]
  );
  const clampedEnd = React.useMemo(
    () => Math.max(0, Math.min(endTime, duration)),
    [endTime, duration]
  );

  const startPercent = duration > 0 ? (clampedStart / duration) * 100 : 0;
  const endPercent = duration > 0 ? (clampedEnd / duration) * 100 : 0;

  const includeHours = duration >= 3600;

  const thumbId = React.useId();
  const startSliderId = `${thumbId}-start`;
  const endSliderId = `${thumbId}-end`;

  function clampPair(newStart: number, newEnd: number): [number, number] {
    let s = Math.max(0, Math.min(newStart, duration));
    let e = Math.max(0, Math.min(newEnd, duration));
    if (e - s < minRange) {
      if (newStart !== clampedStart) {
        s = Math.max(0, e - minRange);
      } else {
        e = Math.min(duration, s + minRange);
      }
    }
    return [s, e];
  }

  function pointerPosition(clientX: number): number {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function handleTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const frac = pointerPosition(e.clientX);
    const clickTime = frac * duration;
    const distToStart = Math.abs(clickTime - clampedStart);
    const distToEnd = Math.abs(clickTime - clampedEnd);
    if (distToStart <= distToEnd) {
      const [s, e] = clampPair(clickTime, clampedEnd);
      onChange(s, e);
      startThumbRef.current?.focus();
    } else {
      const [s, e] = clampPair(clampedStart, clickTime);
      onChange(s, e);
      endThumbRef.current?.focus();
    }
  }

  function handleThumbPointerDown(thumb: 'start' | 'end') {
    return (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setActiveThumb(thumb);

      function onMove(ev: PointerEvent) {
        const frac = pointerPosition(ev.clientX);
        const clickTime = frac * duration;
        if (thumb === 'start') {
          const [s, e] = clampPair(clickTime, clampedEnd);
          onChange(s, e);
        } else {
          const [s, e] = clampPair(clampedStart, clickTime);
          onChange(s, e);
        }
      }

      function onUp() {
        setActiveThumb(null);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      }

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    };
  }

  function handleKeyDown(thumb: 'start' | 'end') {
    return (e: React.KeyboardEvent<HTMLButtonElement>) => {
      let step = 1;
      if (e.shiftKey) step = 5;

      let newStart = clampedStart;
      let newEnd = clampedEnd;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (thumb === 'start') {
          newStart = Math.min(clampedEnd - minRange, clampedStart + step);
        } else {
          newEnd = Math.min(duration, clampedEnd + step);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (thumb === 'start') {
          newStart = Math.max(0, clampedStart - step);
        } else {
          newEnd = Math.max(clampedStart + minRange, clampedEnd - step);
        }
      } else if (e.key === 'Tab') {
        return;
      } else {
        return;
      }

      const [s, e] = clampPair(newStart, newEnd);
      onChange(s, e);
    };
  }

  function handleInputChange(thumb: 'start' | 'end', raw: string) {
    const totalSeconds = parseTimeInput(raw, duration);
    if (thumb === 'start') {
      const [s, e] = clampPair(totalSeconds, clampedEnd);
      onChange(s, e);
    } else {
      const [s, e] = clampPair(clampedStart, totalSeconds);
      onChange(s, e);
    }
  }

  function startInputValue(): string {
    if (includeHours || clampedStart >= 3600) {
      const h = Math.floor(clampedStart / 3600);
      const m = Math.floor((clampedStart % 3600) / 60);
      const s = Math.floor(clampedStart % 60);
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    const m = Math.floor(clampedStart / 60);
    const s = Math.floor(clampedStart % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function endInputValue(): string {
    if (includeHours || clampedEnd >= 3600) {
      const h = Math.floor(clampedEnd / 3600);
      const m = Math.floor((clampedEnd % 3600) / 60);
      const s = Math.floor(clampedEnd % 60);
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    const m = Math.floor(clampedEnd / 60);
    const s = Math.floor(clampedEnd % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div
        ref={trackRef}
        className="relative h-10 w-full rounded-md bg-surface-input cursor-pointer select-none touch-none"
        onPointerDown={handleTrackPointerDown}
        role="presentation"
        aria-hidden="true"
      >
        <div
          className="absolute inset-y-0 rounded-md bg-brand/30"
          style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
        />
        {Array.from({ length: Math.max(1, Math.floor(duration)) }).map((_, i) => {
          if (i % 10 !== 0) return null;
          const pct = (i / duration) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-border-muted/30"
              style={{ left: `${pct}%` }}
            />
          );
        })}
        <button
          ref={startThumbRef}
          type="button"
          role="slider"
          id={startSliderId}
          aria-label={`Start time, ${formatTime(clampedStart, includeHours)}`}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.round(clampedStart)}
          aria-valuetext={`Start time ${formatTime(clampedStart, includeHours)}`}
          tabIndex={0}
          className={cn(
            'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10',
            'size-5 rounded-full border-2 border-white bg-brand shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            activeThumb === 'start' ? 'scale-125' : 'hover:scale-110',
            'transition-transform'
          )}
          style={{ left: `${startPercent}%` }}
          onPointerDown={handleThumbPointerDown('start')}
          onKeyDown={handleKeyDown('start')}
        />
        <button
          ref={endThumbRef}
          type="button"
          role="slider"
          id={endSliderId}
          aria-label={`End time, ${formatTime(clampedEnd, includeHours)}`}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.round(clampedEnd)}
          aria-valuetext={`End time ${formatTime(clampedEnd, includeHours)}`}
          tabIndex={0}
          className={cn(
            'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10',
            'size-5 rounded-full border-2 border-white bg-brand shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            activeThumb === 'end' ? 'scale-125' : 'hover:scale-110',
            'transition-transform'
          )}
          style={{ left: `${endPercent}%` }}
          onPointerDown={handleThumbPointerDown('end')}
          onKeyDown={handleKeyDown('end')}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-on-muted">Start</span>
          {editing === 'start' ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                handleInputChange('start', editValue);
                setEditing(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInputChange('start', editValue);
                  setEditing(null);
                }
                if (e.key === 'Escape') {
                  setEditing(null);
                }
              }}
              className="h-7 w-20 rounded border border-border-dark bg-surface-input px-2 text-xs font-mono text-foreground focus:border-brand focus:outline-none"
              autoFocus
              aria-label="Edit start time"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditValue(startInputValue());
                setEditing('start');
              }}
              className="h-7 rounded bg-surface px-2 text-xs font-mono text-foreground hover:bg-surface-hover transition-colors"
              aria-label="Edit start time"
            >
              {formatTime(clampedStart, includeHours)}
            </button>
          )}
        </div>
        <span className="text-xs text-on-muted">—</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-on-muted">End</span>
          {editing === 'end' ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                handleInputChange('end', editValue);
                setEditing(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInputChange('end', editValue);
                  setEditing(null);
                }
                if (e.key === 'Escape') {
                  setEditing(null);
                }
              }}
              className="h-7 w-20 rounded border border-border-dark bg-surface-input px-2 text-xs font-mono text-foreground focus:border-brand focus:outline-none"
              autoFocus
              aria-label="Edit end time"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditValue(endInputValue());
                setEditing('end');
              }}
              className="h-7 rounded bg-surface px-2 text-xs font-mono text-foreground hover:bg-surface-hover transition-colors"
              aria-label="Edit end time"
            >
              {formatTime(clampedEnd, includeHours)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TimeRangePicker;
