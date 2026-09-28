'use client';

/**
 * QualityManualOverride — Issue #416
 *
 * Implements manual override flow for borderline quality scores, allowing
 * authorized reviewers (A&R, admins) to approve/reject tracks that fall
 * in the review range.
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA) initiative.
 */

import { useState, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  MessageSquare,
  User,
  Clock,
  FileText,
  Info,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import QualityBadge from './QualityBadge';

export type OverrideDecision = 'approve' | 'reject' | 'pending';

export interface OverrideReviewer {
  id: string;
  name: string;
  role: 'admin' | 'a&r' | 'moderator';
  avatarUrl?: string;
}

export interface OverrideHistory {
  reviewerId: string;
  reviewerName: string;
  decision: OverrideDecision;
  reason: string;
  timestamp: number;
}

export interface QualityManualOverrideProps {
  /** Track ID being reviewed */
  trackId: string;
  /** Track title */
  trackTitle: string;
  /** Artist name */
  artist?: string;
  /** Quality score from AI analysis */
  score: number;
  /** Genre of the track */
  genre?: string;
  /** Current reviewer (if authorized) */
  reviewer?: OverrideReviewer;
  /** Previous override attempts */
  history?: OverrideHistory[];
  /** Current override decision */
  decision?: OverrideDecision;
  /** Callback when override decision is made */
  onOverride: (trackId: string, decision: 'approve' | 'reject', reason: string) => Promise<void>;
  /** Callback when requesting additional review */
  onRequestReview?: (trackId: string, note: string) => Promise<void>;
  /** Show history of past overrides */
  showHistory?: boolean;
  /** Is the current user authorized to override */
  canOverride?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const DECISION_CONFIG = {
  approve: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/40',
    label: 'Approved',
  },
  reject: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/40',
    label: 'Rejected',
  },
  pending: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/40',
    label: 'Pending Review',
  },
};

const ROLE_BADGES = {
  admin: { label: 'Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  'a&r': { label: 'A&R', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  moderator: { label: 'Moderator', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

export default function QualityManualOverride({
  trackId,
  trackTitle,
  artist,
  score,
  genre,
  reviewer,
  history = [],
  decision = 'pending',
  onOverride,
  onRequestReview,
  showHistory = true,
  canOverride = false,
  className = '',
}: QualityManualOverrideProps) {
  const [overrideReason, setOverrideReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const decisionConfig = DECISION_CONFIG[decision];
  const DecisionIcon = decisionConfig.icon;
  const hasHistory = history.length > 0;

  const handleOverride = useCallback(
    async (overrideDecision: 'approve' | 'reject') => {
      if (!canOverride || !overrideReason.trim() || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await onOverride(trackId, overrideDecision, overrideReason);
        setOverrideReason('');
      } catch (error) {
        console.error('Override failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canOverride, overrideReason, isSubmitting, onOverride, trackId]
  );

  const handleRequestReview = useCallback(async () => {
    if (!onRequestReview || !reviewNote.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onRequestReview(trackId, reviewNote);
      setReviewNote('');
      setShowReviewForm(false);
    } catch (error) {
      console.error('Review request failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [onRequestReview, reviewNote, isSubmitting, trackId]);

  return (
    <div
      role="region"
      aria-label="Manual quality override interface"
      className={cn(
        'rounded-2xl border bg-card/80 backdrop-blur p-6 space-y-5',
        decisionConfig.borderColor,
        className
      )}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              decisionConfig.bgColor,
              decisionConfig.borderColor,
              'border'
            )}
          >
            <DecisionIcon className={decisionConfig.color} size={24} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              Manual Override Review
              {decision !== 'pending' && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    decisionConfig.bgColor,
                    decisionConfig.color
                  )}
                >
                  {decisionConfig.label}
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Borderline score requires manual review
            </p>
          </div>
        </div>

        {/* Authorization Badge */}
        {canOverride && reviewer && (
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={16} aria-hidden="true" />
            <span
              className={cn(
                'rounded-full border px-2 py-1 text-xs font-semibold',
                ROLE_BADGES[reviewer.role].color
              )}
            >
              {ROLE_BADGES[reviewer.role].label}
            </span>
          </div>
        )}
      </div>

      {/* Track Info Card */}
      <div className="rounded-xl border border-border/50 bg-background/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-base font-bold text-foreground">{trackTitle}</h4>
            {artist && <p className="text-sm text-muted-foreground">{artist}</p>}
          </div>
          <QualityBadge score={score} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Score:</span>
            <span className="ml-2 font-bold text-foreground">{Math.round(score)}/100</span>
          </div>
          {genre && (
            <div>
              <span className="text-muted-foreground">Genre:</span>
              <span className="ml-2 font-semibold text-foreground">{genre}</span>
            </div>
          )}
        </div>
      </div>

      {/* Authorization Warning */}
      {!canOverride && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
          <div className="flex items-start gap-3">
            <Lock className="text-amber-400 shrink-0 mt-0.5" size={18} aria-hidden="true" />
            <div>
              <h5 className="text-sm font-semibold text-amber-400 mb-1">Authorization Required</h5>
              <p className="text-xs text-muted-foreground">
                Only authorized A&R staff, moderators, and admins can approve or reject tracks with
                borderline scores.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Override Form (for authorized users) */}
      {canOverride && decision === 'pending' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="override-reason"
              className="block text-sm font-semibold text-foreground mb-2"
            >
              Override Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              id="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why this track should be approved or rejected despite the borderline score..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 20 characters. Be specific about production quality, mixing, or artistic
              merit.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
            <button
              onClick={() => handleOverride('reject')}
              disabled={overrideReason.trim().length < 20 || isSubmitting}
              type="button"
              className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle size={16} aria-hidden="true" />
              {isSubmitting ? 'Processing...' : 'Override: Reject'}
            </button>
            <button
              onClick={() => handleOverride('approve')}
              disabled={overrideReason.trim().length < 20 || isSubmitting}
              type="button"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              {isSubmitting ? 'Processing...' : 'Override: Approve'}
            </button>
          </div>
        </div>
      )}

      {/* Request Additional Review (for non-authorized or uncertain cases) */}
      {onRequestReview && (
        <div className="space-y-3">
          {!showReviewForm ? (
            <button
              onClick={() => setShowReviewForm(true)}
              type="button"
              className="w-full rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors"
            >
              <MessageSquare size={16} className="inline mr-2" aria-hidden="true" />
              Request Additional A&R Review
            </button>
          ) : (
            <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-3">
              <label htmlFor="review-note" className="block text-sm font-semibold text-foreground">
                Add a note for the A&R team
              </label>
              <textarea
                id="review-note"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="E.g., 'Great vocals but mix needs work' or 'Unsure about genre fit'..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowReviewForm(false)}
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestReview}
                  disabled={!reviewNote.trim() || isSubmitting}
                  type="button"
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decision Summary (after override) */}
      {decision !== 'pending' && (
        <div
          className={cn(
            'rounded-xl border p-4',
            decisionConfig.bgColor,
            decisionConfig.borderColor
          )}
        >
          <div className="flex items-start gap-3">
            <DecisionIcon className={decisionConfig.color} size={20} aria-hidden="true" />
            <div>
              <h5 className="text-sm font-semibold text-foreground mb-1">
                {decision === 'approve' ? 'Track Approved' : 'Track Rejected'}
              </h5>
              <p className="text-xs text-muted-foreground">
                {decision === 'approve'
                  ? 'This track has been manually approved and will proceed to publication.'
                  : 'This track has been manually rejected and will not be published.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Override History */}
      {showHistory && hasHistory && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText size={14} aria-hidden="true" />
            Override History ({history.length})
          </h4>
          <div className="space-y-2">
            {history.map((entry, index) => (
              <div key={index} className="rounded-lg border border-border/40 bg-background/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs font-semibold text-foreground">
                      {entry.reviewerName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-semibold',
                        entry.decision === 'approve'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300'
                      )}
                    >
                      {entry.decision === 'approve' ? 'Approved' : 'Rejected'}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={12} aria-hidden="true" />
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{entry.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
        <div className="flex items-start gap-2">
          <Info className="text-blue-400 shrink-0 mt-0.5" size={16} aria-hidden="true" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Borderline scores</strong> (typically 65-75)
            indicate tracks that don't clearly pass or fail automated quality checks. Manual review
            helps ensure that artistic merit and genre-specific nuances are properly considered.
          </p>
        </div>
      </div>
    </div>
  );
}
