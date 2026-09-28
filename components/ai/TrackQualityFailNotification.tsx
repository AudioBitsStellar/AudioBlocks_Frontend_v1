'use client';

// #419 — TrackQualityFailNotification shows the artist a clear, actionable
// failure notification when their uploaded track does not meet the platform's
// AI quality threshold (Mastra AI + NVIDIA). The notification surfaces the
// score, the reasons the AI flagged the track, and next-step actions so the
// artist always knows what to fix and how to resubmit.
//
// Usage:
//   import TrackQualityFailNotification from '@/components/ai/TrackQualityFailNotification';
//
//   <TrackQualityFailNotification
//     trackTitle="Rough Mix"
//     score={42}
//     reasons={['Excessive background noise detected', 'Low dynamic range']}
//     onReUpload={handleReUpload}
//     onRequestReview={handleRequestReview}
//     onDismiss={handleDismiss}
//   />

import { XCircle, AlertTriangle, X, RefreshCw, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrackQualityFailNotificationProps {
  /** The name of the track that failed quality check. */
  trackTitle: string;
  /** Quality score on a 0–100 scale returned by the Mastra/NVIDIA pipeline. */
  score: number;
  /**
   * Human-readable reasons the AI gave for rejecting or flagging the track.
   * Sourced from `SongQualityAssessment.reasons` in the upload pipeline.
   */
  reasons?: string[];
  /** Optional artist name for extra context. */
  artist?: string;
  /**
   * Whether the track is in "review" state (borderline, needs manual A&R check)
   * rather than a hard rejection. Adjusts the visual weight and copy.
   */
  isReview?: boolean;
  /** Called when the artist clicks "Re-upload / Adjust Track". */
  onReUpload?: () => void;
  /** Called when the artist requests a manual A&R review. */
  onRequestReview?: () => void;
  /** Called when the notification is dismissed. */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Notification shown to an artist when their track fails (or is flagged for
 * review by) the AI quality check.
 *
 * Resolves GitHub issue #419 — Add notification to artist when track fails
 * quality check (part of the AI Song Quality Filter initiative).
 */
export default function TrackQualityFailNotification({
  trackTitle,
  score,
  reasons = [],
  artist,
  isReview = false,
  onReUpload,
  onRequestReview,
  onDismiss,
  className,
}: TrackQualityFailNotificationProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

  // Visual palette differs between hard reject (rose) and soft review (amber)
  const palette = isReview
    ? {
        border: 'border-amber-500/40',
        bg: 'bg-amber-500/10',
        iconBg: 'bg-amber-500/20',
        iconText: 'text-amber-400',
        heading: 'text-amber-300',
        bar: 'bg-amber-500',
        scoreText: 'text-amber-400',
        ring: 'focus-visible:ring-amber-500',
      }
    : {
        border: 'border-rose-500/40',
        bg: 'bg-rose-500/10',
        iconBg: 'bg-rose-500/20',
        iconText: 'text-rose-400',
        heading: 'text-rose-300',
        bar: 'bg-rose-500',
        scoreText: 'text-rose-400',
        ring: 'focus-visible:ring-rose-500',
      };

  const Icon = isReview ? AlertTriangle : XCircle;
  const heading = isReview ? 'Track Flagged for Review' : 'Track Failed Quality Check';
  const bodyText = isReview
    ? "Your track's quality score is borderline. Our A&R team will review it manually before a final decision is made."
    : "Your track didn't meet the platform's minimum quality standards set by our AI filter. Review the feedback below and re-upload an improved version.";

  return (
    <div
      aria-label={`Track "${trackTitle}" ${isReview ? 'flagged for review' : 'failed quality check'} with a score of ${clampedScore} out of 100`}
      aria-live="assertive"
      className={cn(
        'relative rounded-xl border p-5 shadow-lg',
        palette.border,
        palette.bg,
        className
      )}
      role="alert"
    >
      {/* Dismiss button */}
      {onDismiss && (
        <button
          aria-label="Dismiss notification"
          className={cn(
            'absolute top-3 right-3 rounded-md p-1 text-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2',
            palette.ring
          )}
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
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            palette.iconBg,
            palette.iconText
          )}
        >
          <Icon size={20} />
        </span>

        <div className="flex-1 min-w-0">
          <h3 className={cn('text-sm font-semibold', palette.heading)}>{heading}</h3>
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
          <span className={cn('font-bold', palette.scoreText)}>
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
            className={cn('h-full rounded-full transition-all duration-500', palette.bar)}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
      </div>

      {/* Body copy */}
      <p className="mt-3 text-xs text-foreground/70 leading-relaxed">{bodyText}</p>

      {/* AI reasons */}
      {reasons.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
            Feedback from AI review
          </p>
          <ul aria-label="Quality check feedback" className="space-y-1">
            {reasons.map((reason, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 rounded-lg bg-muted/40 p-2 text-xs text-foreground/80 border border-border/30"
              >
                <span aria-hidden="true" className={cn('font-bold shrink-0', palette.scoreText)}>
                  •
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {(onReUpload || onRequestReview) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onReUpload && (
            <button
              className={cn(
                'flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500'
              )}
              type="button"
              onClick={onReUpload}
            >
              <RefreshCw aria-hidden="true" size={13} />
              Re-upload / Adjust Track
            </button>
          )}

          {onRequestReview && (
            <button
              className={cn(
                'flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2',
                palette.ring
              )}
              type="button"
              onClick={onRequestReview}
            >
              <HelpCircle aria-hidden="true" size={12} />
              Request Manual Review
            </button>
          )}
        </div>
      )}
    </div>
  );
}
