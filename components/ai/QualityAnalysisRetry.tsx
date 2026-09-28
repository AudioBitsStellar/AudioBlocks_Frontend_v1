'use client';

/**
 * QualityAnalysisRetry — Issue #415
 *
 * Implements retry flow for failed quality analysis with exponential backoff,
 * progress tracking, and user-friendly error handling.
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA) initiative.
 */

import { useState, useCallback } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type RetryStatus = 'idle' | 'retrying' | 'success' | 'failed' | 'max-attempts-reached';

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: number;
  error?: string;
  duration?: number;
}

export interface QualityAnalysisRetryProps {
  /** Track ID being retried */
  trackId: string;
  /** Track title for display */
  trackTitle?: string;
  /** Current retry status */
  status: RetryStatus;
  /** Array of previous retry attempts */
  attempts?: RetryAttempt[];
  /** Maximum number of retry attempts allowed */
  maxAttempts?: number;
  /** Callback when retry is triggered */
  onRetry: (trackId: string) => Promise<void>;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Callback when giving up after max attempts */
  onGiveUp?: () => void;
  /** Show detailed attempt history */
  showHistory?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const STATUS_CONFIG = {
  idle: {
    icon: RefreshCw,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
    borderColor: 'border-border',
  },
  retrying: {
    icon: Loader2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/40',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/40',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/40',
  },
  'max-attempts-reached': {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/40',
  },
};

export default function QualityAnalysisRetry({
  trackId,
  trackTitle,
  status,
  attempts = [],
  maxAttempts = 3,
  onRetry,
  onCancel,
  onGiveUp,
  showHistory = true,
  className = '',
}: QualityAnalysisRetryProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const currentAttempt = attempts.length;
  const canRetry = currentAttempt < maxAttempts && status !== 'success' && status !== 'retrying';
  const isMaxAttemptsReached = currentAttempt >= maxAttempts && status !== 'success';

  const handleRetry = useCallback(async () => {
    if (!canRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry(trackId);
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [canRetry, isRetrying, onRetry, trackId]);

  return (
    <div
      role="region"
      aria-label="Quality analysis retry interface"
      className={cn(
        'rounded-2xl border bg-card/80 backdrop-blur p-6 space-y-4',
        statusConfig.borderColor,
        className
      )}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              statusConfig.bgColor,
              statusConfig.borderColor,
              'border'
            )}
          >
            <StatusIcon
              className={cn(statusConfig.color, status === 'retrying' && 'animate-spin')}
              size={24}
              aria-hidden="true"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {status === 'success'
                ? 'Analysis Complete'
                : status === 'retrying'
                  ? 'Retrying Analysis...'
                  : status === 'max-attempts-reached'
                    ? 'Maximum Attempts Reached'
                    : 'Analysis Failed'}
            </h3>
            {trackTitle && <p className="text-xs text-muted-foreground mt-0.5">{trackTitle}</p>}
          </div>
        </div>

        {/* Attempt Counter */}
        {status !== 'success' && (
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              statusConfig.bgColor,
              statusConfig.color
            )}
            aria-label={`Attempt ${currentAttempt} of ${maxAttempts}`}
          >
            {currentAttempt}/{maxAttempts}
          </span>
        )}
      </div>

      {/* Status Message */}
      <div className={cn('rounded-xl border p-4', statusConfig.bgColor, statusConfig.borderColor)}>
        {status === 'success' && (
          <p className="text-sm text-foreground">
            Quality analysis completed successfully after {currentAttempt}{' '}
            {currentAttempt === 1 ? 'attempt' : 'attempts'}.
          </p>
        )}
        {status === 'retrying' && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              Attempt {currentAttempt + 1} of {maxAttempts} in progress...
            </p>
            <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse rounded-full w-full" />
            </div>
          </div>
        )}
        {status === 'failed' && (
          <p className="text-sm text-foreground">
            The quality analysis failed.{' '}
            {canRetry
              ? 'You can try again or wait a few moments before retrying.'
              : 'Please contact support if the issue persists.'}
          </p>
        )}
        {status === 'max-attempts-reached' && (
          <p className="text-sm text-foreground">
            Maximum retry attempts reached. The track will be sent for manual review, or you can
            re-upload with improvements.
          </p>
        )}
        {status === 'idle' && attempts.length > 0 && (
          <p className="text-sm text-foreground">
            Previous attempts: {attempts.length}. Ready to retry.
          </p>
        )}
      </div>

      {/* Attempt History */}
      {showHistory && attempts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock size={14} aria-hidden="true" />
            Attempt History
          </h4>
          <div className="space-y-1.5">
            {attempts.map((attempt) => (
              <div
                key={attempt.attemptNumber}
                className="flex items-center justify-between rounded-lg bg-background/50 border border-border/40 p-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    Attempt {attempt.attemptNumber}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(attempt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {attempt.error ? (
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle size={12} aria-hidden="true" />
                    Failed
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={12} aria-hidden="true" />
                    {attempt.duration ? `${attempt.duration}ms` : 'Completed'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Error Details */}
      {attempts.length > 0 && attempts[attempts.length - 1]?.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
          <div className="flex items-start gap-2">
            <Info className="text-red-400 shrink-0 mt-0.5" size={16} aria-hidden="true" />
            <div>
              <h5 className="text-xs font-semibold text-red-400 mb-1">Last Error</h5>
              <p className="text-xs text-muted-foreground">{attempts[attempts.length - 1].error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border/60">
        {onCancel && status === 'retrying' && (
          <button
            onClick={onCancel}
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        )}

        {canRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            type="button"
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw size={16} aria-hidden="true" />
                Retry Analysis ({maxAttempts - currentAttempt} left)
              </>
            )}
          </button>
        )}

        {isMaxAttemptsReached && onGiveUp && (
          <button
            onClick={onGiveUp}
            type="button"
            className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            Request Manual Review
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook for managing retry logic with exponential backoff
 */
export function useQualityAnalysisRetry(initialMaxAttempts = 3): {
  status: RetryStatus;
  attempts: RetryAttempt[];
  retry: (fn: () => Promise<void>) => Promise<void>;
  reset: () => void;
} {
  const [status, setStatus] = useState<RetryStatus>('idle');
  const [attempts, setAttempts] = useState<RetryAttempt[]>([]);

  const retry = useCallback(
    async (fn: () => Promise<void>) => {
      const attemptNumber = attempts.length + 1;

      if (attemptNumber > initialMaxAttempts) {
        setStatus('max-attempts-reached');
        return;
      }

      setStatus('retrying');
      const startTime = Date.now();

      try {
        await fn();
        const duration = Date.now() - startTime;

        setAttempts((prev) => [
          ...prev,
          {
            attemptNumber,
            timestamp: startTime,
            duration,
          },
        ]);
        setStatus('success');
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setAttempts((prev) => [
          ...prev,
          {
            attemptNumber,
            timestamp: startTime,
            error: errorMessage,
            duration,
          },
        ]);
        setStatus('failed');

        // Exponential backoff: wait before allowing next retry
        if (attemptNumber < initialMaxAttempts) {
          const backoffMs = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    },
    [attempts.length, initialMaxAttempts]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setAttempts([]);
  }, []);

  return { status, attempts, retry, reset };
}
