'use client';

// #426 — MastraAgentFallback renders the UI shown to users (admin or artist)
// when the Mastra AI agent (backed by NVIDIA NIM) errors out during the
// quality check pipeline. The component clearly explains what went wrong,
// what the fallback state means for the track, and what actions are available
// next — so a broken AI service never leaves the artist without context or a
// clear path forward.
//
// Fallback states supported:
//  • 'timeout'   — The NVIDIA API call timed out (AbortError).
//  • 'api-error' — A non-OK HTTP response came back from the NVIDIA endpoint.
//  • 'parse-error' — The model returned an unparsable answer.
//  • 'unknown'   — Any other unexpected error in the Mastra agent.
//
// Usage:
//   import MastraAgentFallback from '@/components/ai/MastraAgentFallback';
//
//   <MastraAgentFallback
//     errorType="timeout"
//     trackTitle="Midnight Signal"
//     onRetry={requeueQualityCheck}
//     onSendToManualReview={sendToManualQueue}
//     onDismiss={dismissPanel}
//   />

import { AlertTriangle, Clock, ServerCrash, FileX, HelpCircle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MastraErrorType = 'timeout' | 'api-error' | 'parse-error' | 'unknown';

export interface MastraAgentFallbackProps {
  /** Category of error that caused the Mastra agent to fail. */
  errorType?: MastraErrorType;
  /** The track being analysed when the error occurred. */
  trackTitle?: string;
  /** Raw error message surfaced from the pipeline (sanitised before display). */
  errorDetail?: string;
  /** Whether a retry is currently in progress. */
  isRetrying?: boolean;
  /** Retry the quality check pipeline for this track. */
  onRetry?: () => void;
  /** Route the track straight into the manual A&R review queue. */
  onSendToManualReview?: () => void;
  /** Dismiss the fallback panel (e.g. to navigate away). */
  onDismiss?: () => void;
  className?: string;
}

// --------------------------------------------------------------------------
// Static display metadata per error type
// --------------------------------------------------------------------------

interface ErrorMeta {
  Icon: typeof AlertTriangle;
  heading: string;
  body: string;
  retryLabel: string;
}

const ERROR_META: Record<MastraErrorType, ErrorMeta> = {
  timeout: {
    Icon: Clock,
    heading: 'Quality check timed out',
    body: 'The Mastra AI agent took too long to receive a response from the NVIDIA NIM model. This can happen during periods of high demand. Your track has been placed in the manual review queue in the meantime.',
    retryLabel: 'Retry AI check',
  },
  'api-error': {
    Icon: ServerCrash,
    heading: 'AI service temporarily unavailable',
    body: 'The NVIDIA API returned an error. This is usually a transient issue. Your track will not be published without a quality assessment — retry in a few minutes or request manual A&R review to keep your release moving.',
    retryLabel: 'Retry AI check',
  },
  'parse-error': {
    Icon: FileX,
    heading: 'AI response could not be parsed',
    body: 'The Mastra agent received a response from the NVIDIA model but could not extract a valid quality assessment from it. Your track has been automatically queued for manual A&R review so no decision is lost.',
    retryLabel: 'Retry AI check',
  },
  unknown: {
    Icon: AlertTriangle,
    heading: 'Unexpected error during quality check',
    body: 'An unexpected error occurred in the Mastra AI quality check pipeline. Your track is safe and has been queued for manual review. Our engineering team is notified automatically.',
    retryLabel: 'Retry AI check',
  },
};

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

/**
 * Fallback UI shown when the Mastra AI agent (NVIDIA-backed quality check)
 * errors out in the upload pipeline.
 *
 * Resolves GitHub issue #426 — Add fallback behavior if Mastra agent errors
 * out (part of the AI Song Quality Filter initiative).
 */
export default function MastraAgentFallback({
  errorType = 'unknown',
  trackTitle,
  errorDetail,
  isRetrying = false,
  onRetry,
  onSendToManualReview,
  onDismiss,
  className,
}: MastraAgentFallbackProps) {
  const { Icon, heading, body, retryLabel } = ERROR_META[errorType];

  // Sanitise: only show the first 120 chars of the raw error so we never
  // accidentally leak an API key fragment or stack trace to the UI.
  const safeDetail =
    typeof errorDetail === 'string' && errorDetail.trim().length > 0
      ? errorDetail.trim().slice(0, 120)
      : null;

  return (
    <div
      aria-label={`Mastra AI quality check failed${trackTitle ? ` for "${trackTitle}"` : ''}: ${heading}`}
      aria-live="assertive"
      className={cn(
        'relative rounded-xl border border-orange-500/40 bg-orange-500/10 p-5 shadow-lg',
        className
      )}
      role="alert"
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          aria-label="Dismiss"
          className="absolute top-3 right-3 rounded-md p-1 text-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          type="button"
          onClick={onDismiss}
        >
          <X aria-hidden="true" size={14} />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 pr-6">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400"
        >
          <Icon size={20} />
        </span>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-orange-300">{heading}</h3>
          {trackTitle && (
            <p className="mt-0.5 text-xs text-foreground/70 truncate">
              Track: <strong className="font-medium">{trackTitle}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <p className="mt-3 text-xs text-foreground/70 leading-relaxed">{body}</p>

      {/* Sanitised error detail (collapsed / secondary) */}
      {safeDetail && (
        <p className="mt-2 rounded-lg bg-muted/40 border border-border/30 px-3 py-2 text-xs font-mono text-foreground/50 break-all">
          {safeDetail}
          {errorDetail && errorDetail.length > 120 && <span aria-hidden="true"> …</span>}
        </p>
      )}

      {/* Fallback status badge */}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-300">
        <HelpCircle aria-hidden="true" size={12} />
        Fallback: track queued for manual review
      </div>

      {/* Actions */}
      {(onRetry || onSendToManualReview) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onRetry && (
            <button
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              disabled={isRetrying}
              type="button"
              onClick={onRetry}
            >
              {isRetrying ? (
                <RefreshCw aria-hidden="true" className="animate-spin" size={13} />
              ) : (
                <RefreshCw aria-hidden="true" size={13} />
              )}
              {isRetrying ? 'Retrying…' : retryLabel}
            </button>
          )}

          {onSendToManualReview && (
            <button
              className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              disabled={isRetrying}
              type="button"
              onClick={onSendToManualReview}
            >
              <HelpCircle aria-hidden="true" size={12} />
              Send to Manual Review
            </button>
          )}
        </div>
      )}
    </div>
  );
}
