'use client';

// #420 — TrackQualityPassNotification shows the artist a rich, dismissable
// success notification when their uploaded track clears the AI quality check
// (Mastra AI + NVIDIA). The notification displays the track name, final
// quality score, a call-to-action to publish, and an optional link to the
// full analysis report so the artist can understand what they did right.
//
// Usage:
//   import TrackQualityPassNotification from '@/components/ai/TrackQualityPassNotification';
//
//   <TrackQualityPassNotification
//     trackTitle="Midnight Signal"
//     score={87}
//     onPublish={handlePublish}
//     onViewReport={handleViewReport}
//     onDismiss={handleDismiss}
//   />

import { CheckCircle2, Sparkles, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrackQualityPassNotificationProps {
  /** The name of the track that passed quality check. */
  trackTitle: string;
  /** Quality score on a 0–100 scale returned by the Mastra/NVIDIA pipeline. */
  score: number;
  /** Optional artist name for extra context. */
  artist?: string;
  /** Called when the artist clicks "Publish to catalog". */
  onPublish?: () => void;
  /** Called when the artist wants to see the full AI analysis report. */
  onViewReport?: () => void;
  /** Called when the notification is dismissed. */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Notification shown to an artist when their track passes the AI quality check.
 *
 * Resolves GitHub issue #420 — Add notification to artist when track passes
 * quality check (part of the AI Song Quality Filter initiative).
 */
export default function TrackQualityPassNotification({
  trackTitle,
  score,
  artist,
  onPublish,
  onViewReport,
  onDismiss,
  className,
}: TrackQualityPassNotificationProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

  return (
    <div
      aria-label={`Track "${trackTitle}" passed quality check with a score of ${clampedScore} out of 100`}
      aria-live="polite"
      className={cn(
        'relative rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-lg',
        className
      )}
      role="status"
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          aria-label="Dismiss notification"
          className="absolute top-3 right-3 rounded-md p-1 text-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
        >
          <CheckCircle2 size={20} />
        </span>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
            <Sparkles aria-hidden="true" size={13} />
            Track Passed Quality Check
          </h3>

          <p className="mt-0.5 text-xs text-foreground/80 truncate">
            <strong className="font-semibold">{trackTitle}</strong>
            {artist && <span className="text-foreground/60"> by {artist}</span>}
          </p>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-4 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground/60">Quality score</span>
          <span className="font-bold text-emerald-400">
            {clampedScore}
            <span className="font-normal text-foreground/50">/100</span>
          </span>
        </div>
        <div
          aria-label={`Quality score: ${clampedScore} out of 100`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={clampedScore}
          className="w-full h-2 rounded-full bg-muted overflow-hidden"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${clampedScore}%` }}
          />
        </div>
      </div>

      {/* Body copy */}
      <p className="mt-3 text-xs text-foreground/70 leading-relaxed">
        Your track met the platform&apos;s AI quality standards and is ready to be published to the
        AudioBlocks catalog. Congratulations! 🎉
      </p>

      {/* Actions */}
      {(onPublish || onViewReport) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onPublish && (
            <button
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              type="button"
              onClick={onPublish}
            >
              <CheckCircle2 aria-hidden="true" size={13} />
              Publish to Catalog
            </button>
          )}

          {onViewReport && (
            <button
              className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              type="button"
              onClick={onViewReport}
            >
              <ExternalLink aria-hidden="true" size={12} />
              View Full Report
            </button>
          )}
        </div>
      )}
    </div>
  );
}
