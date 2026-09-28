import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TrackQualityPassNotification from '@/components/ai/TrackQualityPassNotification';

/**
 * Tests for TrackQualityPassNotification (#420).
 * Verifies the artist notification shown when a track passes quality check.
 */
describe('TrackQualityPassNotification', () => {
  it('renders the success notification with track title', () => {
    render(<TrackQualityPassNotification score={87} trackTitle="Midnight Signal" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Midnight Signal')).toBeInTheDocument();
    expect(screen.getByText(/track passed quality check/i)).toBeInTheDocument();
  });

  it('displays the clamped quality score', () => {
    render(<TrackQualityPassNotification score={87} trackTitle="Test Track" />);
    expect(screen.getByText('87')).toBeInTheDocument();
  });

  it('clamps score above 100 to 100', () => {
    render(<TrackQualityPassNotification score={150} trackTitle="Test Track" />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('clamps score below 0 to 0', () => {
    render(<TrackQualityPassNotification score={-10} trackTitle="Test Track" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders the score progressbar with correct aria attributes', () => {
    render(<TrackQualityPassNotification score={72} trackTitle="Track" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '72');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('shows the artist name when provided', () => {
    render(<TrackQualityPassNotification artist="DJ Pulse" score={91} trackTitle="Solar Flare" />);
    expect(screen.getByText(/DJ Pulse/)).toBeInTheDocument();
  });

  it('shows the Publish to Catalog button and fires onPublish', () => {
    const onPublish = vi.fn();
    render(<TrackQualityPassNotification score={80} trackTitle="Track" onPublish={onPublish} />);

    const btn = screen.getByRole('button', { name: /publish to catalog/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('shows the View Full Report button and fires onViewReport', () => {
    const onViewReport = vi.fn();
    render(
      <TrackQualityPassNotification score={80} trackTitle="Track" onViewReport={onViewReport} />
    );

    const btn = screen.getByRole('button', { name: /view full report/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onViewReport).toHaveBeenCalledTimes(1);
  });

  it('renders a dismiss button and fires onDismiss', () => {
    const onDismiss = vi.fn();
    render(<TrackQualityPassNotification score={80} trackTitle="Track" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss notification/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('hides dismiss button when onDismiss is not provided', () => {
    render(<TrackQualityPassNotification score={80} trackTitle="Track" />);
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('hides action buttons when no handlers are provided', () => {
    render(<TrackQualityPassNotification score={80} trackTitle="Track" />);
    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
  });
});
