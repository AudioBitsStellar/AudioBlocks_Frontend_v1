'use client';

// Route: /dashboard/admin/review-queue
// Issue #417 — Admin review queue page for tracks flagged by the AI quality
// check pipeline (Mastra AI + NVIDIA). Renders the AdminReviewQueue
// component wired to a stub data layer that can be replaced with a real
// React Query / API call when the backend endpoint is available.

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AdminReviewQueue, {
  type ReviewQueueItem,
  type ReviewStatus,
} from '@/components/admin/AdminReviewQueue';

// ---------------------------------------------------------------------------
// Stub data — replace with a React Query hook backed by the backend API once
// GET /api/admin/review-queue is implemented on the AudioBlock Backend.
// ---------------------------------------------------------------------------

const STUB_ITEMS: ReviewQueueItem[] = [
  {
    id: 'track-001',
    trackTitle: 'Neon Pulse',
    artistName: 'DJ Radix',
    genre: 'Electronic',
    score: 42,
    flagReasons: ['low-score'],
    analysisNotes: [
      'Quality score (42/100) failed Electronic minimum threshold (70/100).',
      'Excessive background noise detected in the mid-frequency range.',
    ],
    flaggedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  },
  {
    id: 'track-002',
    trackTitle: 'Midnight Glow',
    artistName: 'Luna Sol',
    genre: 'Afrobeats',
    score: 65,
    flagReasons: ['borderline-score', 'explicit-content'],
    analysisNotes: [
      'Quality score (65/100) is borderline for Afrobeats threshold (68/100).',
      'Explicit lyrical content detected — EXPLICIT [E] tag required.',
    ],
    flaggedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  },
  {
    id: 'track-003',
    trackTitle: 'Pharaoh Bounce',
    artistName: 'King Tutu',
    genre: 'Hip-Hop',
    score: 71,
    flagReasons: ['plagiarism-suspected'],
    analysisNotes: [
      'Acoustic fingerprint matches a known track within 12% similarity tolerance.',
      'Manual review advised before publication.',
    ],
    flaggedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    status: 'info-requested',
  },
  {
    id: 'track-004',
    trackTitle: 'Stellar Waves',
    artistName: 'Cosmo Beat',
    genre: 'Synthwave',
    score: 0,
    flagReasons: ['agent-error'],
    analysisNotes: [
      'Mastra AI agent timed out before returning a quality assessment.',
      'Track automatically queued for manual A&R review.',
    ],
    flaggedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'pending',
  },
  {
    id: 'track-005',
    trackTitle: 'Resonance',
    artistName: 'Ola Kuti',
    genre: 'Afropop',
    score: 88,
    flagReasons: ['manual-request'],
    analysisNotes: ['Artist requested manual A&R review before automated publication.'],
    flaggedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AdminReviewQueuePage() {
  const [items, setItems] = useState<ReviewQueueItem[]>(STUB_ITEMS);
  const [isLoading, setIsLoading] = useState(false);

  function updateItemStatus(id: string, status: ReviewStatus) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  async function handleApprove(id: string) {
    // TODO: call PATCH /api/admin/review-queue/:id { status: 'approved' }
    updateItemStatus(id, 'approved');
  }

  async function handleReject(id: string, reason?: string) {
    // TODO: call PATCH /api/admin/review-queue/:id { status: 'rejected', reason }
    void reason; // will be forwarded to the API
    updateItemStatus(id, 'rejected');
  }

  async function handleRequestInfo(id: string) {
    // TODO: call PATCH /api/admin/review-queue/:id { status: 'info-requested' }
    updateItemStatus(id, 'info-requested');
  }

  async function handleRefresh() {
    setIsLoading(true);
    // TODO: refetch from React Query / API
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          href="/dashboard/settings"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Settings
        </Link>
      </div>

      <AdminReviewQueue
        isLoading={isLoading}
        items={items}
        onApprove={handleApprove}
        onRefresh={handleRefresh}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </div>
  );
}
