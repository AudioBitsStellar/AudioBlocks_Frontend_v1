import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QualityAnalysisRetry, {
  useQualityAnalysisRetry,
  type RetryAttempt,
} from '@/components/ai/QualityAnalysisRetry';
import { renderHook, act } from '@testing-library/react';

/**
 * Tests for QualityAnalysisRetry component (#415)
 * Retry flow for failed quality analysis with exponential backoff
 */

describe('QualityAnalysisRetry', () => {
  const mockAttempts: RetryAttempt[] = [
    {
      attemptNumber: 1,
      timestamp: Date.now() - 60000,
      error: 'Network timeout',
      duration: 5000,
    },
  ];

  describe('Basic Rendering', () => {
    it('renders retry interface', () => {
      render(<QualityAnalysisRetry trackId="track-123" status="failed" onRetry={vi.fn()} />);

      expect(
        screen.getByRole('region', { name: /quality analysis retry interface/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/analysis failed/i)).toBeInTheDocument();
    });

    it('displays track title when provided', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          trackTitle="Midnight Drive"
          status="failed"
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText('Midnight Drive')).toBeInTheDocument();
    });

    it('shows attempt counter', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="failed"
          attempts={mockAttempts}
          maxAttempts={3}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/attempt 1 of 3/i)).toBeInTheDocument();
    });
  });

  describe('Status States', () => {
    it('displays idle state', () => {
      render(<QualityAnalysisRetry trackId="track-123" status="idle" onRetry={vi.fn()} />);

      expect(screen.getByRole('button', { name: /retry analysis/i })).toBeInTheDocument();
    });

    it('displays retrying state with progress', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="retrying"
          attempts={mockAttempts}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText(/retrying analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/attempt 2 of 3 in progress/i)).toBeInTheDocument();
    });

    it('displays success state', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="success"
          attempts={mockAttempts}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
      expect(screen.getByText(/completed successfully after 1 attempt/i)).toBeInTheDocument();
    });

    it('displays failed state', () => {
      render(<QualityAnalysisRetry trackId="track-123" status="failed" onRetry={vi.fn()} />);

      expect(screen.getByText(/analysis failed/i)).toBeInTheDocument();
      expect(screen.getByText(/you can try again/i)).toBeInTheDocument();
    });

    it('displays max-attempts-reached state', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="max-attempts-reached"
          attempts={[mockAttempts[0], mockAttempts[0], mockAttempts[0]]}
          maxAttempts={3}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText(/maximum attempts reached/i)).toBeInTheDocument();
      expect(screen.getByText(/sent for manual review/i)).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('calls onRetry when retry button is clicked', async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);

      render(<QualityAnalysisRetry trackId="track-123" status="failed" onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry analysis/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledWith('track-123');
      });
    });

    it('disables retry button when already retrying', () => {
      render(<QualityAnalysisRetry trackId="track-123" status="retrying" onRetry={vi.fn()} />);

      const retryButton = screen.queryByRole('button', { name: /retry/i });
      expect(retryButton).not.toBeInTheDocument();
    });

    it('disables retry button after max attempts', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="failed"
          attempts={[mockAttempts[0], mockAttempts[0], mockAttempts[0]]}
          maxAttempts={3}
          onRetry={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /retry analysis/i })).not.toBeInTheDocument();
    });

    it('shows remaining attempts count', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="failed"
          attempts={mockAttempts}
          maxAttempts={3}
          onRetry={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: /retry analysis \(2 left\)/i })
      ).toBeInTheDocument();
    });
  });

  describe('Attempt History', () => {
    it('displays attempt history when showHistory is true', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="failed"
          attempts={mockAttempts}
          showHistory={true}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText(/attempt history/i)).toBeInTheDocument();
      expect(screen.getByText('Attempt 1')).toBeInTheDocument();
    });

    it('hides attempt history when showHistory is false', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="failed"
          attempts={mockAttempts}
          showHistory={false}
          onRetry={vi.fn()}
        />
      );

      expect(screen.queryByText(/attempt history/i)).not.toBeInTheDocument();
    });

    it('shows error information for failed attempts', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="failed"
          attempts={mockAttempts}
          showHistory={true}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText('Network timeout')).toBeInTheDocument();
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });

    it('formats attempt timestamp', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="failed"
          attempts={mockAttempts}
          showHistory={true}
          onRetry={vi.fn()}
        />
      );

      const timestamp = new Date(mockAttempts[0].timestamp).toLocaleTimeString();
      expect(screen.getByText(timestamp)).toBeInTheDocument();
    });

    it('shows duration for completed attempts', () => {
      const successAttempts: RetryAttempt[] = [
        {
          attemptNumber: 1,
          timestamp: Date.now(),
          duration: 3000,
        },
      ];

      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="success"
          attempts={successAttempts}
          showHistory={true}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText('3000ms')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('calls onCancel when cancel button is clicked during retry', () => {
      const onCancel = vi.fn();

      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="retrying"
          onCancel={onCancel}
          onRetry={vi.fn()}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not show cancel button when not retrying', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="failed"
          onCancel={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('calls onGiveUp when max attempts reached', () => {
      const onGiveUp = vi.fn();

      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="max-attempts-reached"
          attempts={[mockAttempts[0], mockAttempts[0], mockAttempts[0]]}
          maxAttempts={3}
          onGiveUp={onGiveUp}
          onRetry={vi.fn()}
        />
      );

      const giveUpButton = screen.getByRole('button', { name: /request manual review/i });
      fireEvent.click(giveUpButton);

      expect(onGiveUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper region role', () => {
      render(<QualityAnalysisRetry trackId="track-123" status="failed" onRetry={vi.fn()} />);

      expect(
        screen.getByRole('region', { name: /quality analysis retry interface/i })
      ).toBeInTheDocument();
    });

    it('attempt counter has accessible label', () => {
      render(
        <QualityAnalysisRetry
          trackId="track-123"
          status="failed"
          attempts={mockAttempts}
          maxAttempts={3}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByLabelText(/attempt 1 of 3/i)).toBeInTheDocument();
    });
  });
});

describe('useQualityAnalysisRetry hook', () => {
  it('initializes with idle status and empty attempts', () => {
    const { result } = renderHook(() => useQualityAnalysisRetry());

    expect(result.current.status).toBe('idle');
    expect(result.current.attempts).toEqual([]);
  });

  it('tracks successful retry', async () => {
    const { result } = renderHook(() => useQualityAnalysisRetry());

    const mockFn = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.retry(mockFn);
    });

    expect(result.current.status).toBe('success');
    expect(result.current.attempts).toHaveLength(1);
    expect(result.current.attempts[0].attemptNumber).toBe(1);
    expect(result.current.attempts[0].error).toBeUndefined();
  });

  it('tracks failed retry', async () => {
    const { result } = renderHook(() => useQualityAnalysisRetry());

    const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));

    await act(async () => {
      await result.current.retry(mockFn);
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.attempts).toHaveLength(1);
    expect(result.current.attempts[0].error).toBe('Test error');
  });

  it('stops after max attempts', async () => {
    const { result } = renderHook(() => useQualityAnalysisRetry(2));

    const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));

    await act(async () => {
      await result.current.retry(mockFn);
    });

    await act(async () => {
      await result.current.retry(mockFn);
    });

    await act(async () => {
      await result.current.retry(mockFn);
    });

    expect(result.current.status).toBe('max-attempts-reached');
    expect(result.current.attempts).toHaveLength(2);
  });

  it('resets state', async () => {
    const { result } = renderHook(() => useQualityAnalysisRetry());

    const mockFn = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.retry(mockFn);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.attempts).toEqual([]);
  });
});
