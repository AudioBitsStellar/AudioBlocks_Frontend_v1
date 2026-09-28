'use client';

/**
 * QualityFeedbackDetails — Issue #414
 *
 * Shows detailed quality feedback including specific technical issues
 * detected during analysis (e.g., clipping, distortion, low bitrate).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA) initiative.
 */

import {
  AlertTriangle,
  Volume2,
  VolumeX,
  Zap,
  Music,
  FileAudio,
  WavesLadder,
  TrendingDown,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeedbackSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface QualityFeedbackItem {
  /** Unique identifier for the feedback item */
  id: string;
  /** Type of issue detected */
  type:
    | 'clipping'
    | 'distortion'
    | 'low-bitrate'
    | 'poor-mixing'
    | 'dynamic-range'
    | 'frequency-imbalance'
    | 'noise'
    | 'phase-issues'
    | 'loudness'
    | 'other';
  /** Severity level */
  severity: FeedbackSeverity;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Optional: Specific measurement or metric */
  metric?: string;
  /** Optional: Recommendation for fixing */
  recommendation?: string;
}

export interface QualityFeedbackDetailsProps {
  /** Array of feedback items */
  feedback: QualityFeedbackItem[];
  /** Optional title for the feedback section */
  title?: string;
  /** Show recommendations inline */
  showRecommendations?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const SEVERITY_STYLES: Record<
  FeedbackSeverity,
  { bg: string; border: string; text: string; icon: typeof AlertTriangle }
> = {
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    text: 'text-red-400',
    icon: XCircle,
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    icon: Info,
  },
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    icon: CheckCircle2,
  },
};

const ISSUE_TYPE_ICONS: Record<QualityFeedbackItem['type'], typeof Volume2> = {
  clipping: VolumeX,
  distortion: Zap,
  'low-bitrate': FileAudio,
  'poor-mixing': Music,
  'dynamic-range': TrendingDown,
  'frequency-imbalance': WavesLadder,
  noise: AlertTriangle,
  'phase-issues': Zap,
  loudness: Volume2,
  other: Info,
};

const SEVERITY_LABELS: Record<FeedbackSeverity, string> = {
  critical: 'Critical Issue',
  warning: 'Warning',
  info: 'Information',
  success: 'Passed',
};

export default function QualityFeedbackDetails({
  feedback,
  title = 'Technical Quality Analysis',
  showRecommendations = true,
  className = '',
}: QualityFeedbackDetailsProps) {
  // Group feedback by severity
  const criticalIssues = feedback.filter((f) => f.severity === 'critical');
  const warnings = feedback.filter((f) => f.severity === 'warning');
  const info = feedback.filter((f) => f.severity === 'info');
  const successes = feedback.filter((f) => f.severity === 'success');

  const hasCriticalIssues = criticalIssues.length > 0;
  const hasWarnings = warnings.length > 0;

  return (
    <div
      role="region"
      aria-label="Quality feedback details"
      className={cn(
        'rounded-2xl border border-border/60 bg-card/80 backdrop-blur p-6 space-y-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {feedback.length} {feedback.length === 1 ? 'item' : 'items'} detected
          </p>
        </div>

        {/* Summary Badge */}
        <div className="flex items-center gap-2">
          {hasCriticalIssues && (
            <span className="rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-400">
              {criticalIssues.length} Critical
            </span>
          )}
          {hasWarnings && (
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400">
              {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* No issues message */}
      {feedback.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="text-emerald-400 mb-3" size={48} aria-hidden="true" />
          <h4 className="text-base font-semibold text-foreground mb-1">No Issues Detected</h4>
          <p className="text-sm text-muted-foreground">
            Your track meets all technical quality standards.
          </p>
        </div>
      )}

      {/* Critical Issues First */}
      {criticalIssues.length > 0 && (
        <FeedbackSection
          items={criticalIssues}
          showRecommendations={showRecommendations}
          sectionTitle="Critical Issues"
        />
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <FeedbackSection
          items={warnings}
          showRecommendations={showRecommendations}
          sectionTitle="Warnings"
        />
      )}

      {/* Info */}
      {info.length > 0 && (
        <FeedbackSection
          items={info}
          showRecommendations={showRecommendations}
          sectionTitle="Additional Information"
        />
      )}

      {/* Successes */}
      {successes.length > 0 && (
        <FeedbackSection
          items={successes}
          showRecommendations={showRecommendations}
          sectionTitle="Passed Checks"
        />
      )}
    </div>
  );
}

interface FeedbackSectionProps {
  items: QualityFeedbackItem[];
  showRecommendations: boolean;
  sectionTitle: string;
}

function FeedbackSection({ items, showRecommendations, sectionTitle }: FeedbackSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {sectionTitle}
      </h4>
      <div className="space-y-2">
        {items.map((item) => (
          <FeedbackItemCard key={item.id} item={item} showRecommendation={showRecommendations} />
        ))}
      </div>
    </div>
  );
}

interface FeedbackItemCardProps {
  item: QualityFeedbackItem;
  showRecommendation: boolean;
}

function FeedbackItemCard({ item, showRecommendation }: FeedbackItemCardProps) {
  const severityStyle = SEVERITY_STYLES[item.severity];
  const SeverityIcon = severityStyle.icon;
  const TypeIcon = ISSUE_TYPE_ICONS[item.type];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all hover:shadow-md',
        severityStyle.bg,
        severityStyle.border
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon Section */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            severityStyle.bg,
            severityStyle.border,
            'border'
          )}
        >
          <TypeIcon className={severityStyle.text} size={20} aria-hidden="true" />
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-center gap-2 mb-1">
            <SeverityIcon className={severityStyle.text} size={14} aria-hidden="true" />
            <h5 className="text-sm font-semibold text-foreground">{item.title}</h5>
            <span
              className={cn(
                'ml-auto rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wider',
                severityStyle.text
              )}
            >
              {SEVERITY_LABELS[item.severity]}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{item.description}</p>

          {/* Metric (if available) */}
          {item.metric && (
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-mono font-semibold',
                severityStyle.bg,
                severityStyle.text
              )}
            >
              <Info size={12} aria-hidden="true" />
              {item.metric}
            </div>
          )}

          {/* Recommendation (if available and enabled) */}
          {showRecommendation && item.recommendation && (
            <div className="mt-3 rounded-md bg-background/60 border border-border/40 p-3">
              <h6 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-primary" aria-hidden="true" />
                Recommendation
              </h6>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.recommendation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
