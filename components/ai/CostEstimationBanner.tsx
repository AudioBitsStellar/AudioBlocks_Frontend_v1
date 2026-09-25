'use client';

// #457 — CostEstimationBanner renders a cost summary and confirmation step
// before the user triggers a large batch AI song quality analysis so they can
// review expected GPU / API spend before committing.
//
// Usage:
//   import CostEstimationBanner from '@/components/ai/CostEstimationBanner';
//   <CostEstimationBanner
//     trackCount={tracks.length}
//     onConfirm={runBatchAnalysis}
//     onCancel={() => setShowEstimate(false)}
//   />

import { useState } from 'react';

// Rough cost constants — tune these to match actual NVIDIA / Mastra pricing.
const COST_PER_TRACK_USD = 0.012; // ~$0.012 per track for NVIDIA NIM inference
const FREE_TIER_TRACKS = 50;

interface Props {
  trackCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CostEstimationBanner({ trackCount, onConfirm, onCancel }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  const billableTracks = Math.max(0, trackCount - FREE_TIER_TRACKS);
  const estimatedCost = (billableTracks * COST_PER_TRACK_USD).toFixed(2);
  const isFree = billableTracks === 0;

  function handleConfirm() {
    setConfirmed(true);
    onConfirm();
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby="cost-estimate-title"
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <span className="text-amber-400 text-xl" aria-hidden="true">⚠</span>
        <div>
          <h3 id="cost-estimate-title" className="text-sm font-semibold text-amber-300">
            Batch analysis cost estimate
          </h3>
          <p className="text-xs text-foreground/70 mt-0.5">
            You are about to run AI quality analysis on{' '}
            <strong>{trackCount}</strong> track{trackCount !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-foreground/60">Tracks selected</dt>
        <dd className="font-medium">{trackCount}</dd>
        <dt className="text-foreground/60">Free-tier allowance</dt>
        <dd className="font-medium">{FREE_TIER_TRACKS} tracks / month</dd>
        <dt className="text-foreground/60">Billable tracks</dt>
        <dd className="font-medium">{billableTracks}</dd>
        <dt className="text-foreground/60">Rate</dt>
        <dd className="font-medium">${COST_PER_TRACK_USD.toFixed(3)} / track</dd>
        <dt className="text-foreground/60 border-t border-border/30 pt-1">Estimated cost</dt>
        <dd className={`font-bold pt-1 border-t border-border/30 ${isFree ? 'text-green-400' : 'text-amber-300'}`}>
          {isFree ? 'Free' : `$${estimatedCost}`}
        </dd>
      </dl>

      <p className="text-xs text-foreground/50">
        Actual charges may vary. Costs are billed to your connected payment method.
      </p>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirmed}
          className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50"
        >
          {confirmed ? 'Running…' : `Confirm & run${isFree ? '' : ` ($${estimatedCost})`}`}
        </button>
      </div>
    </div>
  );
}
