import { AlertTriangle, Award, Medal } from 'lucide-react';
import { getQualityTier, QUALITY_TIER_LABELS, type QualityTier } from '@/lib/qualityBadge';

interface QualityBadgeProps {
  /** Overall quality score on a 0–100 scale. */
  score: number;
  className?: string;
}

const TIER_STYLES: Record<QualityTier, string> = {
  gold: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  silver: 'bg-slate-400/15 text-slate-300 border-slate-400/40',
  'needs-improvement': 'bg-red-500/15 text-red-400 border-red-500/40',
};

const TIER_ICONS: Record<QualityTier, typeof Award> = {
  gold: Award,
  silver: Medal,
  'needs-improvement': AlertTriangle,
};

const QualityBadge = ({ score, className = '' }: QualityBadgeProps) => {
  const tier = getQualityTier(score);
  const Icon = TIER_ICONS[tier];
  const label = QUALITY_TIER_LABELS[tier];

  return (
    <span
      aria-label={`${label} (score ${Math.round(score)} out of 100)`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TIER_STYLES[tier]} ${className}`}
      data-tier={tier}
    >
      <Icon aria-hidden="true" size={12} />
      {label}
    </span>
  );
};

export default QualityBadge;
