import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QualityManualOverride, {
  type OverrideReviewer,
  type OverrideHistory,
} from '@/components/ai/QualityManualOverride';

/**
 * Tests for QualityManualOverride component (#416)
 * Manual override flow for borderline quality scores
 */

describe('QualityManualOverride', () => {
  const mockReviewer: OverrideReviewer = {
    id: 'reviewer-1',
    name: 'John Doe',
    role: 'a&r',
  };

  const mockHistory: OverrideHistory[] = [
    {
      reviewerId: 'reviewer-2',
      reviewerName: 'Jane Smith',
      decision: 'reject',
      reason: 'Mixing quality below standards',
      timestamp: Date.now() - 86400000,
    },
  ];

  describe('Basic Rendering', () => {
    it('renders manual override interface', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Midnight Drive"
          score={70}
          onOverride={vi.fn()}
        />
      );

      expect(
        screen.getByRole('region', { name: /manual quality override interface/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/manual override review/i)).toBeInTheDocument();
    });

    it('displays track information', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Midnight Drive"
          artist="Artist Name"
          score={70}
          genre="Electronic"
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText('Midnight Drive')).toBeInTheDocument();
      expect(screen.getByText('Artist Name')).toBeInTheDocument();
      expect(screen.getByText('70/100')).toBeInTheDocument();
      expect(screen.getByText('Electronic')).toBeInTheDocument();
    });

    it('displays pending review status by default', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText(/pending review/i)).toBeInTheDocument();
      expect(screen.getByText(/borderline score requires manual review/i)).toBeInTheDocument();
    });
  });

  describe('Authorization', () => {
    it('shows authorization badge for authorized reviewer', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText('A&R')).toBeInTheDocument();
    });

    it('shows admin badge for admin reviewer', () => {
      const adminReviewer: OverrideReviewer = {
        ...mockReviewer,
        role: 'admin',
      };

      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={adminReviewer}
          canOverride={true}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('shows authorization warning when user cannot override', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          canOverride={false}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText(/authorization required/i)).toBeInTheDocument();
      expect(screen.getByText(/only authorized a&r staff/i)).toBeInTheDocument();
    });

    it('hides override form when user is not authorized', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          canOverride={false}
          onOverride={vi.fn()}
        />
      );

      expect(screen.queryByLabelText(/override reason/i)).not.toBeInTheDocument();
    });
  });

  describe('Override Form', () => {
    it('displays override reason textarea for authorized users', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/override reason/i)).toBeInTheDocument();
    });

    it('requires minimum 20 characters for override reason', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText(/minimum 20 characters/i)).toBeInTheDocument();
    });

    it('disables buttons when reason is too short', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          onOverride={vi.fn()}
        />
      );

      const textarea = screen.getByLabelText(/override reason/i);
      fireEvent.change(textarea, { target: { value: 'Too short' } });

      const approveButton = screen.getByRole('button', { name: /override: approve/i });
      const rejectButton = screen.getByRole('button', { name: /override: reject/i });

      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });

    it('enables buttons when reason is long enough', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          onOverride={vi.fn()}
        />
      );

      const textarea = screen.getByLabelText(/override reason/i);
      fireEvent.change(textarea, {
        target: { value: 'This is a valid reason with more than 20 characters' },
      });

      const approveButton = screen.getByRole('button', { name: /override: approve/i });
      const rejectButton = screen.getByRole('button', { name: /override: reject/i });

      expect(approveButton).not.toBeDisabled();
      expect(rejectButton).not.toBeDisabled();
    });
  });

  describe('Override Actions', () => {
    it('calls onOverride with approve decision', async () => {
      const onOverride = vi.fn().mockResolvedValue(undefined);

      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          onOverride={onOverride}
        />
      );

      const textarea = screen.getByLabelText(/override reason/i);
      fireEvent.change(textarea, {
        target: { value: 'Excellent production quality despite borderline score' },
      });

      const approveButton = screen.getByRole('button', { name: /override: approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(onOverride).toHaveBeenCalledWith(
          'track-123',
          'approve',
          'Excellent production quality despite borderline score'
        );
      });
    });

    it('calls onOverride with reject decision', async () => {
      const onOverride = vi.fn().mockResolvedValue(undefined);

      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          onOverride={onOverride}
        />
      );

      const textarea = screen.getByLabelText(/override reason/i);
      fireEvent.change(textarea, {
        target: { value: 'Mixing quality does not meet platform standards' },
      });

      const rejectButton = screen.getByRole('button', { name: /override: reject/i });
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(onOverride).toHaveBeenCalledWith(
          'track-123',
          'reject',
          'Mixing quality does not meet platform standards'
        );
      });
    });

    it('clears form after successful override', async () => {
      const onOverride = vi.fn().mockResolvedValue(undefined);

      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          onOverride={onOverride}
        />
      );

      const textarea = screen.getByLabelText(/override reason/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: 'Valid reason for override decision' },
      });

      const approveButton = screen.getByRole('button', { name: /override: approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });
  });

  describe('Decision States', () => {
    it('displays approved state', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          decision="approve"
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText(/approved/i)).toBeInTheDocument();
      expect(screen.getByText(/manually approved and will proceed/i)).toBeInTheDocument();
    });

    it('displays rejected state', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          decision="reject"
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
      expect(screen.getByText(/manually rejected and will not be published/i)).toBeInTheDocument();
    });

    it('hides override form after decision is made', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          decision="approve"
          onOverride={vi.fn()}
        />
      );

      expect(screen.queryByLabelText(/override reason/i)).not.toBeInTheDocument();
    });
  });

  describe('Request Additional Review', () => {
    it('shows request review button', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          onOverride={vi.fn()}
          onRequestReview={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: /request additional a&r review/i })
      ).toBeInTheDocument();
    });

    it('opens review form when button is clicked', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          onOverride={vi.fn()}
          onRequestReview={vi.fn()}
        />
      );

      const button = screen.getByRole('button', { name: /request additional a&r review/i });
      fireEvent.click(button);

      expect(screen.getByLabelText(/add a note for the a&r team/i)).toBeInTheDocument();
    });

    it('calls onRequestReview with note', async () => {
      const onRequestReview = vi.fn().mockResolvedValue(undefined);

      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          onOverride={vi.fn()}
          onRequestReview={onRequestReview}
        />
      );

      const button = screen.getByRole('button', { name: /request additional a&r review/i });
      fireEvent.click(button);

      const textarea = screen.getByLabelText(/add a note for the a&r team/i);
      fireEvent.change(textarea, { target: { value: 'Needs second opinion on mixing' } });

      const sendButton = screen.getByRole('button', { name: /send request/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(onRequestReview).toHaveBeenCalledWith('track-123', 'Needs second opinion on mixing');
      });
    });

    it('closes form when cancel is clicked', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          onOverride={vi.fn()}
          onRequestReview={vi.fn()}
        />
      );

      const button = screen.getByRole('button', { name: /request additional a&r review/i });
      fireEvent.click(button);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByLabelText(/add a note for the a&r team/i)).not.toBeInTheDocument();
    });
  });

  describe('Override History', () => {
    it('displays history when showHistory is true', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          history={mockHistory}
          showHistory={true}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText(/override history \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Mixing quality below standards')).toBeInTheDocument();
    });

    it('hides history when showHistory is false', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          history={mockHistory}
          showHistory={false}
          onOverride={vi.fn()}
        />
      );

      expect(screen.queryByText(/override history/i)).not.toBeInTheDocument();
    });

    it('formats history timestamp', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          history={mockHistory}
          showHistory={true}
          onOverride={vi.fn()}
        />
      );

      const timestamp = new Date(mockHistory[0].timestamp).toLocaleString();
      expect(screen.getByText(timestamp)).toBeInTheDocument();
    });

    it('shows decision badge in history', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          history={mockHistory}
          showHistory={true}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    });
  });

  describe('Help Text', () => {
    it('displays borderline score explanation', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByText(/borderline scores/i)).toBeInTheDocument();
      expect(screen.getByText(/typically 65-75/i)).toBeInTheDocument();
      expect(screen.getByText(/artistic merit and genre-specific nuances/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper region role', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          onOverride={vi.fn()}
        />
      );

      expect(
        screen.getByRole('region', { name: /manual quality override interface/i })
      ).toBeInTheDocument();
    });

    it('form inputs have proper labels', () => {
      render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          reviewer={mockReviewer}
          canOverride={true}
          onOverride={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/override reason/i)).toBeInTheDocument();
    });

    it('decorative icons are hidden from screen readers', () => {
      const { container } = render(
        <QualityManualOverride
          trackId="track-123"
          trackTitle="Test Track"
          score={70}
          onOverride={vi.fn()}
        />
      );

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
