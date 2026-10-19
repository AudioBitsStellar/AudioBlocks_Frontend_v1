'use client';

import { useEffect, useState } from 'react';
import {
  formatSleepRemaining,
  SLEEP_TIMER_OPTIONS,
  type SleepTimer,
  type SleepTimerOption,
} from '@/lib/sleepTimer';

export interface SleepTimerMenuProps {
  sleepTimer: SleepTimer | null;
  onSelect: (option: SleepTimerOption) => void;
  onCancel: () => void;
}

/**
 * Sleep timer choices with the active timer's status (#589). Lists the options
 * and a cancel action, and refreshes the countdown once a second while active.
 */
export function SleepTimerMenu({ sleepTimer, onSelect, onCancel }: SleepTimerMenuProps) {
  const timed = sleepTimer?.kind === 'duration';
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!timed) return;
    const id = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(id);
  }, [timed]);

  const status =
    sleepTimer?.kind === 'duration'
      ? `Stops in ${formatSleepRemaining(sleepTimer.endsAt - Date.now())}`
      : sleepTimer?.kind === 'end-of-track'
        ? 'Stops at the end of this track'
        : null;

  return (
    <div>
      <p className="text-xs font-semibold text-white mb-2">Sleep timer</p>
      {status && (
        <div className="flex items-center justify-between gap-2 mb-2 text-xs text-gray-300">
          <span aria-live="polite">{status}</span>
          <button
            className="text-[#D2045B] hover:underline shrink-0"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      )}
      <div aria-label="Sleep timer options" className="grid gap-1" role="group">
        {SLEEP_TIMER_OPTIONS.map(({ option, label }) => (
          <button
            key={label}
            className="text-left text-xs text-white px-2 py-1.5 rounded hover:bg-gray-700"
            type="button"
            onClick={() => onSelect(option)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
