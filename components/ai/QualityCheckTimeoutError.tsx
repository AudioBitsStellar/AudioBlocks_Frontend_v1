'use client';

// #446 — QualityCheckTimeoutError renders the error handling UI shown when
// the AI song quality check (Mastra AI + NVIDIA) times out for a track, so a
// stalled analysis never leaves the artist staring at a hung state. Offers a
// retry and, optionally, a "skip for now" escape hatch for admins.
//
// Usage:
//   import QualityCheckTimeoutError from '@/components/ai/QualityCheckTimeoutError';
//   <QualityCheckTimeoutError
//     trackTitle="Midnight Signal"
//     onRetry={requeueQualityCheck}
//     isRetrying={isRetrying}
//     onSkip={skipForNow}
//   />

import { Hourglass, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  trackTitle?: string;
  onRetry: () => void;
  isRetrying?: boolean;
  /** Optional escape hatch, e.g. the admin-approved skip option (#447). */
  onSkip?: () => void;
  className?: string;
}

export default function QualityCheckTimeoutError({
  trackTitle,
  onRetry,
  isRetrying = false,
  onSkip,
  className,
}: Props) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 flex flex-col gap-3',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Hourglass className="text-orange-400 mt-0.5" size={18} aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-orange-300">
            Quality check timed out
          </h3>
          <p className="text-xs text-foreground/70 mt-0.5">
            The AI quality check for{' '}
            {trackTitle ? (
              <>
                <strong>{trackTitle}</strong>{' '}
              </>
            ) : (
              'this track '
            )}
            is taking longer than expected. You can retry it now or leave the
            track unreviewed for the moment.
          </p>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onSkip && (
          <button
            onClick={onSkip}
            disabled={isRetrying}
            className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            Skip for now
          </button>
        )}
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {isRetrying ? (
            <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={12} aria-hidden="true" />
          )}
          {isRetrying ? 'Retrying…' : 'Retry check'}
        </button>
      </div>
    </div>
  );
}
