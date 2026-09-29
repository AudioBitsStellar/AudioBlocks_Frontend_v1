'use client';

// #417 — AdminReviewQueue is the admin-facing UI that lists all tracks
// flagged for manual review by the AI quality check pipeline (Mastra AI +
// NVIDIA). Admins can approve, reject, or request more information on each
// flagged track directly from this queue, keeping the catalog clean without
// blocking artists longer than necessary.
//
// This is a pure UI/presentational component — data is supplied via props so
// the component is testable in isolation and the caller can wire in any data
// layer (React Query, SWR, server components, etc.).
//
// Usage:
//   import AdminReviewQueue from '@/components/admin/AdminReviewQueue';
//
//   <AdminReviewQueue
//     items={flaggedTracks}
//     onApprove={(id) => approveTrack(id)}
//     onReject={(id, reason) => rejectTrack(id, reason)}
//     onRequestInfo={(id) => requestInfo(id)}
//     isLoading={isFetching}
//   />

import React, { useState, useMemo } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Music2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import QualityBadge from '@/components/ai/QualityBadge';
import { cn } from '@/lib/utils';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'info-requested';

export type FlagReason =
  | 'low-score'
  | 'borderline-score'
  | 'plagiarism-suspected'
  | 'explicit-content'
  | 'agent-error'
  | 'stem-failure'
  | 'manual-request';

export interface ReviewQueueItem {
  /** Unique identifier for the flagged track (matches trackId in the pipeline). */
  id: string;
  trackTitle: string;
  artistName?: string;
  genre?: string;
  /** Quality score on a 0–100 scale from the Mastra/NVIDIA pipeline. */
  score: number;
  /** Primary reason(s) the pipeline flagged this track. */
  flagReasons: FlagReason[];
  /** Human-readable analysis notes forwarded from the pipeline reasons. */
  analysisNotes?: string[];
  /** ISO-8601 timestamp when the track was flagged. */
  flaggedAt: string;
  /** Current review status. */
  status: ReviewStatus;
}

export interface AdminReviewQueueProps {
  /** Tracks currently in the review queue. */
  items: ReviewQueueItem[];
  /** Called when an admin approves a flagged track. */
  onApprove: (id: string) => void | Promise<void>;
  /** Called when an admin rejects a track with an optional reason. */
  onReject: (id: string, reason?: string) => void | Promise<void>;
  /** Called when an admin needs more information before deciding. */
  onRequestInfo?: (id: string) => void | Promise<void>;
  /** Refetch/refresh the queue from the upstream data source. */
  onRefresh?: () => void | Promise<void>;
  /** When true the queue shows loading skeletons instead of rows. */
  isLoading?: boolean;
  className?: string;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  'low-score': 'Low quality score',
  'borderline-score': 'Borderline score',
  'plagiarism-suspected': 'Plagiarism suspected',
  'explicit-content': 'Explicit content',
  'agent-error': 'AI agent error',
  'stem-failure': 'Stem analysis failed',
  'manual-request': 'Manual review requested',
};

const FLAG_REASON_STYLES: Record<FlagReason, string> = {
  'low-score': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'borderline-score': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'plagiarism-suspected': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'explicit-content': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'agent-error': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  'stem-failure': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'manual-request': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const STATUS_STYLES: Record<ReviewStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'info-requested': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  'info-requested': 'Info Requested',
};

function formatRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return isoString;
  }
}

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/30 bg-muted/20 p-4 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-muted/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-48 rounded bg-muted/60" />
        <div className="h-2.5 w-32 rounded bg-muted/40" />
      </div>
      <div className="h-6 w-16 rounded-full bg-muted/60" />
    </div>
  );
}

interface ReviewRowProps {
  item: ReviewQueueItem;
  onApprove: AdminReviewQueueProps['onApprove'];
  onReject: AdminReviewQueueProps['onReject'];
  onRequestInfo?: AdminReviewQueueProps['onRequestInfo'];
}

function ReviewRow({ item, onApprove, onReject, onRequestInfo }: ReviewRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const isPending = item.status === 'pending';

  async function handleApprove() {
    setBusy(true);
    try {
      await onApprove(item.id);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejecting) {
      setRejecting(true);
      return;
    }
    setBusy(true);
    try {
      await onReject(item.id, rejectReason.trim() || undefined);
      setRejecting(false);
      setRejectReason('');
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestInfo() {
    if (!onRequestInfo) return;
    setBusy(true);
    try {
      await onRequestInfo(item.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-border/30 bg-background/60 transition-colors hover:bg-muted/20">
      {/* Main row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
        {/* Track icon */}
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground"
        >
          <Music2 size={18} />
        </span>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {item.trackTitle}
            </span>
            {item.genre && (
              <span className="rounded px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide bg-muted text-muted-foreground">
                {item.genre}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {item.artistName && <span>{item.artistName}</span>}
            <span className="flex items-center gap-1">
              <Clock aria-hidden="true" size={10} />
              {formatRelativeTime(item.flaggedAt)}
            </span>
          </div>
        </div>

        {/* Score badge */}
        <QualityBadge score={item.score} />

        {/* Status */}
        <span
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-xs font-semibold',
            STATUS_STYLES[item.status]
          )}
        >
          {STATUS_LABELS[item.status]}
        </span>

        {/* Expand toggle */}
        <button
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse track details' : 'Expand track details'}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          type="button"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-4">
          {/* Flag reasons */}
          {item.flagReasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                Flagged for
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.flagReasons.map((reason) => (
                  <span
                    key={reason}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      FLAG_REASON_STYLES[reason]
                    )}
                  >
                    {FLAG_REASON_LABELS[reason]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI analysis notes */}
          {item.analysisNotes && item.analysisNotes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                AI analysis notes
              </p>
              <ul aria-label="AI analysis notes" className="space-y-1">
                {item.analysisNotes.map((note, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-muted/40 p-2 text-xs text-foreground/80 border border-border/30"
                  >
                    <AlertTriangle
                      aria-hidden="true"
                      className="text-amber-400 mt-0.5 shrink-0"
                      size={11}
                    />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reject reason input */}
          {rejecting && isPending && (
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold text-muted-foreground"
                htmlFor={`reject-reason-${item.id}`}
              >
                Rejection reason (optional — visible to the artist)
              </label>
              <textarea
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                id={`reject-reason-${item.id}`}
                maxLength={300}
                placeholder="e.g. Excessive background noise, low dynamic range…"
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          )}

          {/* Admin actions */}
          {isPending && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                disabled={busy}
                type="button"
                onClick={handleApprove}
              >
                <CheckCircle2 aria-hidden="true" size={13} />
                Approve
              </button>

              <button
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                disabled={busy}
                type="button"
                onClick={handleReject}
              >
                {busy && rejecting ? (
                  <RefreshCw aria-hidden="true" className="animate-spin" size={13} />
                ) : (
                  <XCircle aria-hidden="true" size={13} />
                )}
                {rejecting ? 'Confirm Reject' : 'Reject'}
              </button>

              {rejecting && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                  disabled={busy}
                  type="button"
                  onClick={() => {
                    setRejecting(false);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </button>
              )}

              {onRequestInfo && (
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  disabled={busy}
                  type="button"
                  onClick={handleRequestInfo}
                >
                  <HelpCircle aria-hidden="true" size={12} />
                  Request Info
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------

/**
 * Admin queue for manually reviewing tracks flagged by the AI quality pipeline.
 *
 * Resolves GitHub issue #417 — Build admin review queue for flagged
 * low-quality tracks (part of the AI Song Quality Filter initiative).
 */
export default function AdminReviewQueue({
  items,
  onApprove,
  onReject,
  onRequestInfo,
  onRefresh,
  isLoading = false,
  className = '',
}: AdminReviewQueueProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score-asc' | 'score-desc'>('newest');

  const filtered = useMemo(() => {
    let result = [...items];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.trackTitle.toLowerCase().includes(q) ||
          (item.artistName?.toLowerCase().includes(q) ?? false) ||
          (item.genre?.toLowerCase().includes(q) ?? false)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.flaggedAt).getTime() - new Date(b.flaggedAt).getTime();
        case 'score-asc':
          return a.score - b.score;
        case 'score-desc':
          return b.score - a.score;
        case 'newest':
        default:
          return new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime();
      }
    });

    return result;
  }, [items, search, statusFilter, sortBy]);

  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <section
      aria-labelledby="admin-review-queue-heading"
      className={cn('space-y-6', className)}
      data-testid="admin-review-queue"
    >
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Shield aria-hidden="true" className="h-6 w-6 text-[#D2045B]" />
            <h2 className="text-xl font-bold text-white" id="admin-review-queue-heading">
              AI Quality Review Queue
            </h2>
            <span className="rounded-full bg-[#D2045B]/15 px-2.5 py-0.5 text-xs font-semibold text-[#D2045B] border border-[#D2045B]/30">
              Admin
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Tracks flagged by the Mastra AI + NVIDIA quality pipeline awaiting manual A&R review.
            {pendingCount > 0 && (
              <span className="ml-1.5 font-semibold text-amber-400">{pendingCount} pending</span>
            )}
          </p>
        </div>

        {onRefresh && (
          <button
            className="flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-2 text-xs font-medium text-foreground/80 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            type="button"
            onClick={() => {
              void onRefresh();
            }}
          >
            <RefreshCw aria-hidden="true" size={13} />
            Refresh
          </button>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Filters & search                                                  */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
          <input
            aria-label="Search flagged tracks"
            className="w-full rounded-lg border border-border bg-muted/30 pl-8 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search by title, artist or genre…"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter aria-hidden="true" className="text-muted-foreground" size={13} />
          <label className="sr-only" htmlFor="status-filter">
            Filter by status
          </label>
          <select
            className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | 'all')}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="info-requested">Info Requested</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="sr-only" htmlFor="sort-by">
            Sort queue
          </label>
          <select
            className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="score-asc">Score: low → high</option>
            <option value="score-desc">Score: high → low</option>
          </select>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Queue list                                                        */}
      {/* ---------------------------------------------------------------- */}
      {isLoading ? (
        <ul aria-busy="true" aria-label="Loading review queue" className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-16 text-center gap-3">
          <Inbox aria-hidden="true" className="text-muted-foreground/50" size={32} />
          <p className="text-sm font-medium text-muted-foreground">
            {items.length === 0
              ? 'The review queue is empty — all tracks are clean!'
              : 'No tracks match your current filters.'}
          </p>
          {items.length > 0 && search && (
            <button
              className="text-xs text-primary hover:underline"
              type="button"
              onClick={() => setSearch('')}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <ul aria-label="Flagged tracks review queue" className="space-y-3">
          {filtered.map((item) => (
            <ReviewRow
              key={item.id}
              item={item}
              onApprove={onApprove}
              onReject={onReject}
              onRequestInfo={onRequestInfo}
            />
          ))}
        </ul>
      )}

      {/* Summary footer */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {filtered.length} of {items.length} track{items.length !== 1 ? 's' : ''}
        </p>
      )}
    </section>
  );
}
