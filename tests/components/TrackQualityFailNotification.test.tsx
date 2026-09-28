import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TrackQualityFailNotification from '@/components/ai/TrackQualityFailNotification';

/**
 * Tests for TrackQualityFailNotification (#419).
 * Verifies the artist notification shown when a track fails quality check.
 */
describe('TrackQualityFailNotification', () => {
  it('renders a hard-reject alert with track title', () => {
    render(<TrackQualityFailNotification score={42} trackTitle="Rough Mix" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Rough Mix')).toBeInTheDocument();
    expect(screen.getByText(/track failed quality check/i)).toBeInTheDocument();
  });

  it('renders a review (soft-reject) variant when isReview is true', () => {
    render(<TrackQualityFailNotification isReview score={65} trackTitle="Demo" />);

    expect(screen.getByText(/track flagged for review/i)).toBeInTheDocument();
  });

  it('displays the quality score', () => {
    render(<TrackQualityFailNotification score={38} trackTitle="Demo" />);
    expect(screen.getByText('38')).toBeInTheDocument();
  });

  it('clamps score to [0, 100]', () => {
    const { rerender } = render(<TrackQualityFailNotification score={-5} trackTitle="Demo" />);
    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(<TrackQualityFailNotification score={200} trackTitle="Demo" />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders the progressbar with correct aria attributes', () => {
    render(<TrackQualityFailNotification score={42} trackTitle="Demo" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('shows the artist name when provided', () => {
    render(<TrackQualityFailNotification artist="Sine Wave" score={40} trackTitle="Demo" />);
    expect(screen.getByText(/Sine Wave/)).toBeInTheDocument();
  });

  it('renders AI feedback reasons as a list', () => {
    render(
      <TrackQualityFailNotification
        reasons={['Background noise detected', 'Low dynamic range']}
        score={30}
        trackTitle="Demo"
      />
    );

    expect(screen.getByText('Background noise detected')).toBeInTheDocument();
    expect(screen.getByText('Low dynamic range')).toBeInTheDocument();
  });

  it('does not render the reasons section when reasons is empty', () => {
    render(<TrackQualityFailNotification reasons={[]} score={30} trackTitle="Demo" />);
    expect(screen.queryByText(/feedback from ai review/i)).not.toBeInTheDocument();
  });

  it('fires onReUpload when Re-upload button is clicked', () => {
    const onReUpload = vi.fn();
    render(<TrackQualityFailNotification score={40} trackTitle="Demo" onReUpload={onReUpload} />);

    fireEvent.click(screen.getByRole('button', { name: /re-upload/i }));
    expect(onReUpload).toHaveBeenCalledTimes(1);
  });

  it('fires onRequestReview when Request Manual Review is clicked', () => {
    const onRequestReview = vi.fn();
    render(
      <TrackQualityFailNotification
        score={40}
        trackTitle="Demo"
        onRequestReview={onRequestReview}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /request manual review/i }));
    expect(onRequestReview).toHaveBeenCalledTimes(1);
  });

  it('renders dismiss button and fires onDismiss', () => {
    const onDismiss = vi.fn();
    render(<TrackQualityFailNotification score={40} trackTitle="Demo" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('hides action buttons when no handlers are provided', () => {
    render(<TrackQualityFailNotification score={40} trackTitle="Demo" />);
    expect(screen.queryByRole('button', { name: /re-upload/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manual review/i })).not.toBeInTheDocument();
  });
});
