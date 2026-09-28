'use client';

/**
 * QualityScoreDisplay — Issue #413
 *
 * Displays quality score to artists in an intuitive, actionable format.
 * Shows overall score, tier badge, and visual progress indicator.
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA) initiative.
 */

import { Award, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import QualityBadge from './QualityBadge';
import { getQualityTier, type QualityTier } from '@/lib/qualityBadge';
import { cn } from '@/lib/utils';

export interface QualityScoreDisplayProps {
  /** Overall quality score on a 0-100 scale */
  score: number;
  /** Optional: Previous score for showing improvement/decline */
  previousScore?: number;
  /** Optional: Genre-specific threshold for context */
  genreThreshold?: number;
  /** Genre name for context */
  genre?: string;
  /** Show detailed breakdown */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when user wants more info */
  onLearnMore?: () => void;
}

const TIER_COLORS: Record<QualityTier, string> = {
  gold: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/40',
  silver: 'from-slate-400/20 to-slate-500/20 border-slate-400/40',
  'needs-improvement': 'from-red-500/20 to-red-600/20 border-red-500/40',
};

const TIER_PROGRESS_COLORS: Record<QualityTier, string> = {
  gold: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
  silver: 'bg-gradient-to-r from-slate-400 to-slate-500',
  'needs-improvement': 'bg-gradient-to-r from-red-400 to-red-600',
};

const TIER_MESSAGES: Record<QualityTier, { title: string; message: string }> = {
  gold: {
    title: 'Excellent Quality!',
    message: 'Your track meets the highest production standards and is ready for publication.',
  },
  silver: {
    title: 'Good Quality',
    message: 'Your track meets platform standards. Consider minor improvements for best results.',
  },
  'needs-improvement': {
    title: 'Needs Improvement',
    message:
      'Your track requires quality improvements before publication. Review the feedback below.',
  },
};

export default function QualityScoreDisplay({
  score,
  previousScore,
  genreThreshold,
  genre,
  showDetails = false,
  className = '',
  onLearnMore,
}: QualityScoreDisplayProps) {
  const tier = getQualityTier(score);
  const scoreDelta = previousScore !== undefined ? score - previousScore : null;
  const hasImproved = scoreDelta !== null && scoreDelta > 0;
  const hasDeclined = scoreDelta !== null && scoreDelta < 0;
  const tierMessage = TIER_MESSAGES[tier];

  // Calculate threshold info if provided
  const thresholdScore = genreThreshold ? Math.round(genreThreshold * 100) : null;
  const meetsThreshold = thresholdScore ? score >= thresholdScore : null;

  return (
    <div
      role="region"
      aria-label="Quality score display"
      className={cn(
        'rounded-2xl border bg-gradient-to-br p-6 shadow-lg',
        TIER_COLORS[tier],
        className
      )}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Award className="text-primary" size={24} aria-hidden="true" />
            Quality Score
          </h3>
          {genre && (
            <p className="text-xs text-muted-foreground mt-1">
              Genre: <span className="font-semibold text-foreground">{genre}</span>
            </p>
          )}
        </div>
        <QualityBadge score={score} />
      </div>

      {/* Score Display */}
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="text-6xl font-black text-foreground"
          aria-label={`Score: ${score} out of 100`}
        >
          {Math.round(score)}
        </span>
        <div className="flex flex-col">
          <span className="text-2xl text-muted-foreground">/100</span>
          {scoreDelta !== null && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-semibold',
                hasImproved
                  ? 'text-emerald-400'
                  : hasDeclined
                    ? 'text-red-400'
                    : 'text-muted-foreground'
              )}
              aria-label={`Score changed by ${scoreDelta > 0 ? '+' : ''}${scoreDelta} points`}
            >
              {hasImproved ? (
                <TrendingUp size={14} aria-hidden="true" />
              ) : hasDeclined ? (
                <TrendingDown size={14} aria-hidden="true" />
              ) : null}
              {scoreDelta > 0 ? '+' : ''}
              {scoreDelta}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full bg-muted/40 rounded-full h-3 overflow-hidden mb-4">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            TIER_PROGRESS_COLORS[tier]
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        {/* Threshold Marker */}
        {thresholdScore && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/60"
            style={{ left: `${thresholdScore}%` }}
            aria-label={`Genre threshold at ${thresholdScore}`}
          />
        )}
      </div>

      {/* Status Message */}
      <div
        className={cn(
          'rounded-xl p-4 mb-4',
          tier === 'gold'
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : tier === 'silver'
              ? 'bg-slate-500/10 border border-slate-400/30'
              : 'bg-red-500/10 border border-red-500/30'
        )}
      >
        <div className="flex items-start gap-3">
          {tier === 'gold' ? (
            <CheckCircle2
              className="text-emerald-400 shrink-0 mt-0.5"
              size={20}
              aria-hidden="true"
            />
          ) : tier === 'silver' ? (
            <Info className="text-slate-400 shrink-0 mt-0.5" size={20} aria-hidden="true" />
          ) : (
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} aria-hidden="true" />
          )}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-1">{tierMessage.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{tierMessage.message}</p>
          </div>
        </div>
      </div>

      {/* Threshold Info (if provided) */}
      {showDetails && thresholdScore && (
        <div className="rounded-lg bg-background/50 border border-border/50 p-3 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{genre || 'Genre'} Minimum Threshold:</span>
            <span className="font-bold text-foreground">{thresholdScore}/100</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">Your Score:</span>
            <span className={cn('font-bold', meetsThreshold ? 'text-emerald-400' : 'text-red-400')}>
              {Math.round(score)}/100 {meetsThreshold ? '✓' : '✗'}
            </span>
          </div>
          {!meetsThreshold && (
            <p className="text-xs text-red-400 mt-2">
              Your track is {Math.round(thresholdScore - score)} points below the {genre} genre
              minimum.
            </p>
          )}
        </div>
      )}

      {/* Learn More Button */}
      {onLearnMore && (
        <button
          onClick={onLearnMore}
          type="button"
          className="w-full rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition-colors"
        >
          Learn How to Improve Your Score
        </button>
      )}
    </div>
  );
}
