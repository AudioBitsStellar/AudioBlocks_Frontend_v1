import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminReviewQueue, { type ReviewQueueItem } from '@/components/admin/AdminReviewQueue';

/**
 * Tests for AdminReviewQueue (#417).
 * Verifies the admin UI for reviewing tracks flagged by the AI quality pipeline.
 */

const NOW = new Date().toISOString();

const MOCK_ITEMS: ReviewQueueItem[] = [
  {
    id: 'track-001',
    trackTitle: 'Neon Pulse',
    artistName: 'DJ Radix',
    genre: 'Electronic',
    score: 42,
    flagReasons: ['low-score'],
    analysisNotes: ['Quality score failed threshold.'],
    flaggedAt: NOW,
    status: 'pending',
  },
  {
    id: 'track-002',
    trackTitle: 'Midnight Glow',
    artistName: 'Luna Sol',
    genre: 'Afrobeats',
    score: 65,
    flagReasons: ['borderline-score'],
    analysisNotes: [],
    flaggedAt: NOW,
    status: 'pending',
  },
  {
    id: 'track-003',
    trackTitle: 'Approved Track',
    artistName: 'Clear Artist',
    genre: 'Pop',
    score: 88,
    flagReasons: ['manual-request'],
    analysisNotes: [],
    flaggedAt: NOW,
    status: 'approved',
  },
];

describe('AdminReviewQueue', () => {
  it('renders the heading and admin badge', () => {
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /AI Quality Review Queue/i })).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders a list item for each queue item', () => {
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText('Neon Pulse')).toBeInTheDocument();
    expect(screen.getByText('Midnight Glow')).toBeInTheDocument();
    expect(screen.getByText('Approved Track')).toBeInTheDocument();
  });

  it('shows loading skeletons when isLoading is true', () => {
    render(<AdminReviewQueue isLoading items={[]} onApprove={vi.fn()} onReject={vi.fn()} />);

    const list = screen.getByRole('list', { name: /loading review queue/i });
    expect(list).toBeInTheDocument();
    // 4 skeleton rows rendered
    expect(list.children).toHaveLength(4);
  });

  it('shows an empty-state message when no items match', () => {
    render(<AdminReviewQueue items={[]} onApprove={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText(/the review queue is empty/i)).toBeInTheDocument();
  });

  it('filters items by search query', () => {
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={vi.fn()} onReject={vi.fn()} />);

    const searchInput = screen.getByRole('searchbox', { name: /search flagged tracks/i });
    fireEvent.change(searchInput, { target: { value: 'Neon' } });

    expect(screen.getByText('Neon Pulse')).toBeInTheDocument();
    expect(screen.queryByText('Midnight Glow')).not.toBeInTheDocument();
  });

  it('shows no-results message and a clear-search button when search finds nothing', () => {
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={vi.fn()} onReject={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'xyznotfound' } });
    expect(screen.getByText(/no tracks match/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('expands a row to show analysis notes and admin actions on click', () => {
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={vi.fn()} onReject={vi.fn()} />);

    const expandBtn = screen.getAllByRole('button', { name: /expand track details/i })[0];
    fireEvent.click(expandBtn);

    expect(screen.getByText('Quality score failed threshold.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument();
  });

  it('calls onApprove with the correct id when Approve is clicked', async () => {
    const onApprove = vi.fn();
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={onApprove} onReject={vi.fn()} />);

    // Expand first pending row
    fireEvent.click(screen.getAllByRole('button', { name: /expand track details/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }));

    expect(onApprove).toHaveBeenCalledWith('track-001');
  });

  it('calls onReject with id and reason after two-step rejection flow', async () => {
    const onReject = vi.fn();
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={vi.fn()} onReject={onReject} />);

    fireEvent.click(screen.getAllByRole('button', { name: /expand track details/i })[0]);
    // First click opens the reason textarea
    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // Enter a reason
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Excessive background noise' },
    });

    // Second click confirms
    fireEvent.click(screen.getByRole('button', { name: /confirm reject/i }));
    expect(onReject).toHaveBeenCalledWith('track-001', 'Excessive background noise');
  });

  it('calls onRequestInfo with the correct id', () => {
    const onRequestInfo = vi.fn();
    render(
      <AdminReviewQueue
        items={MOCK_ITEMS}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRequestInfo={onRequestInfo}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /expand track details/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /request info/i }));
    expect(onRequestInfo).toHaveBeenCalledWith('track-001');
  });

  it('does not render admin actions for already-approved rows', () => {
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={vi.fn()} onReject={vi.fn()} />);

    // Expand the approved row (index 2)
    const expandBtns = screen.getAllByRole('button', { name: /expand track details/i });
    fireEvent.click(expandBtns[2]);

    expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(
      <AdminReviewQueue
        items={MOCK_ITEMS}
        onApprove={vi.fn()}
        onRefresh={onRefresh}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows pending count in the description', () => {
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={vi.fn()} onReject={vi.fn()} />);

    // 2 items are pending
    expect(screen.getByText(/2 pending/i)).toBeInTheDocument();
  });

  it('shows the result count footer', () => {
    render(<AdminReviewQueue items={MOCK_ITEMS} onApprove={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText(/showing 3 of 3 tracks/i)).toBeInTheDocument();
  });
});
