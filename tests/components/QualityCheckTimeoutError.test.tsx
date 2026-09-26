import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QualityCheckTimeoutError from '@/components/ai/QualityCheckTimeoutError';

/**
 * Error handling UI for AI song quality check timeouts (#446).
 */

describe('QualityCheckTimeoutError', () => {
  it('renders the timeout alert with the track title', () => {
    render(
      <QualityCheckTimeoutError trackTitle="Midnight Signal" onRetry={() => {}} />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Midnight Signal')).toBeInTheDocument();
    expect(screen.getByText(/quality check timed out/i)).toBeInTheDocument();
  });

  it('falls back to generic copy when no track title is given', () => {
    render(<QualityCheckTimeoutError onRetry={() => {}} />);

    expect(screen.getByText(/the ai quality check for this track/i)).toBeInTheDocument();
  });

  it('fires onRetry and shows the retrying state', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <QualityCheckTimeoutError onRetry={onRetry} />
    );

    fireEvent.click(screen.getByRole('button', { name: /retry check/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<QualityCheckTimeoutError onRetry={onRetry} isRetrying />);
    expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled();
  });

  it('hides the skip action when onSkip is not provided', () => {
    render(<QualityCheckTimeoutError onRetry={() => {}} />);

    expect(screen.queryByRole('button', { name: /skip for now/i })).not.toBeInTheDocument();
  });

  it('fires onSkip and disables it while retrying', () => {
    const onSkip = vi.fn();
    const { rerender } = render(
      <QualityCheckTimeoutError onRetry={() => {}} onSkip={onSkip} />
    );

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);

    rerender(<QualityCheckTimeoutError onRetry={() => {}} onSkip={onSkip} isRetrying />);
    expect(screen.getByRole('button', { name: /skip for now/i })).toBeDisabled();
  });
});
