"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

interface TimeRangePickerProps {
  /** Total duration in seconds */
  duration: number;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Callback when range changes */
  onChange: (startTime: number, endTime: number) => void;
  /** Minimum range in seconds (default: 5) */
  minRange?: number;
  /** Whether the picker is disabled */
  disabled?: boolean;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function TimeRangePicker({
  duration,
  startTime,
  endTime,
  onChange,
  minRange = 5,
  disabled = false,
}: TimeRangePickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const clampValue = useCallback(
    (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
    []
  );

  const handleThumbMouseDown = (thumb: "start" | "end") => (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setDragging(thumb);
  };

  const handleThumbKeyDown = (thumb: "start" | "end") => (e: React.KeyboardEvent) => {
    if (disabled) return;

    const step = e.shiftKey ? 10 : 1;
    let newStart = startTime;
    let newEnd = endTime;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        if (thumb === "start") newStart = clampValue(startTime - step, 0, endTime - minRange);
        else newEnd = clampValue(endTime - step, startTime + minRange, duration);
        break;
      case "ArrowRight":
      case "ArrowUp":
        if (thumb === "start") newStart = clampValue(startTime + step, 0, endTime - minRange);
        else newEnd = clampValue(endTime + step, startTime + minRange, duration);
        break;
      case "Home":
        if (thumb === "start") newStart = 0;
        else newEnd = startTime + minRange;
        break;
      case "End":
        if (thumb === "start") newStart = endTime - minRange;
        else newEnd = duration;
        break;
      default:
        return;
    }

    e.preventDefault();
    onChange(newStart, newEnd);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.min(Math.max(x / rect.width, 0), 1);
      const time = percentage * duration;

      if (dragging === "start") {
        const newStart = clampValue(time, 0, endTime - minRange);
        onChange(newStart, endTime);
      } else {
        const newEnd = clampValue(time, startTime + minRange, duration);
        onChange(startTime, newEnd);
      }
    };

    const handleMouseUp = () => setDragging(null);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, duration, startTime, endTime, minRange, onChange, clampValue]);

  const startPercent = (startTime / duration) * 100;
  const endPercent = (endTime / duration) * 100;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span className="font-mono">{formatTime(startTime)}</span>
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {formatTime(endTime - startTime)} selected
        </span>
        <span className="font-mono">{formatTime(endTime)}</span>
      </div>

      <div
        ref={trackRef}
        className="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer"
      >
        {/* Selected range */}
        <div
          className="absolute h-full rounded-full bg-teal-500"
          style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
        />

        {/* Start thumb */}
        <div
          role="slider"
          aria-label="Start time"
          aria-valuemin={0}
          aria-valuemax={endTime - minRange}
          aria-valuenow={startTime}
          aria-valuetext={formatTime(startTime)}
          tabIndex={disabled ? -1 : 0}
          onMouseDown={handleThumbMouseDown("start")}
          onKeyDown={handleThumbKeyDown("start")}
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-teal-500 shadow-md transition-transform ${
            dragging === "start" ? "scale-110" : "hover:scale-110"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
          style={{ left: `${startPercent}%` }}
        />

        {/* End thumb */}
        <div
          role="slider"
          aria-label="End time"
          aria-valuemin={startTime + minRange}
          aria-valuemax={duration}
          aria-valuenow={endTime}
          aria-valuetext={formatTime(endTime)}
          tabIndex={disabled ? -1 : 0}
          onMouseDown={handleThumbMouseDown("end")}
          onKeyDown={handleThumbKeyDown("end")}
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-teal-500 shadow-md transition-transform ${
            dragging === "end" ? "scale-110" : "hover:scale-110"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
          style={{ left: `${endPercent}%` }}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="start-time" className="text-xs text-gray-500 dark:text-gray-400">
            Start
          </label>
          <input
            id="start-time"
            type="number"
            min={0}
            max={endTime - minRange}
            value={startTime}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                const newStart = clampValue(val, 0, endTime - minRange);
                onChange(newStart, endTime);
              }
            }}
            disabled={disabled}
            className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
          />
          <span className="text-xs text-gray-400">sec</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="end-time" className="text-xs text-gray-500 dark:text-gray-400">
            End
          </label>
          <input
            id="end-time"
            type="number"
            min={startTime + minRange}
            max={duration}
            value={endTime}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                const newEnd = clampValue(val, startTime + minRange, duration);
                onChange(startTime, newEnd);
              }
            }}
            disabled={disabled}
            className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
          />
          <span className="text-xs text-gray-400">sec</span>
        </div>
      </div>
    </div>
  );
}
