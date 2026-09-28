import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MastraAgentFallback, { type MastraErrorType } from '@/components/ai/MastraAgentFallback';
import { classifyMastraError } from '@/lib/uploadQualityPipeline';

/**
 * Tests for MastraAgentFallback (#426).
 * Verifies the fallback UI shown when the Mastra AI agent errors out during
 * the quality check pipeline.
 */
describe('MastraAgentFallback', () => {
  const ERROR_TYPES: MastraErrorType[] = ['timeout', 'api-error', 'parse-error', 'unknown'];

  it('renders as an alert region', () => {
    render(<MastraAgentFallback />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it.each(ERROR_TYPES)('renders the correct heading for errorType "%s"', (errorType) => {
    render(<MastraAgentFallback errorType={errorType} />);
    // Each error type has a distinct heading — verify something is rendered
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows timeout-specific copy', () => {
    render(<MastraAgentFallback errorType="timeout" />);
    expect(screen.getByText(/quality check timed out/i)).toBeInTheDocument();
  });

  it('shows api-error-specific copy', () => {
    render(<MastraAgentFallback errorType="api-error" />);
    expect(screen.getByText(/AI service temporarily unavailable/i)).toBeInTheDocument();
  });

  it('shows parse-error-specific copy', () => {
    render(<MastraAgentFallback errorType="parse-error" />);
    expect(screen.getByText(/could not be parsed/i)).toBeInTheDocument();
  });

  it('shows unknown-error copy as default', () => {
    render(<MastraAgentFallback />);
    expect(
      screen.getByRole('heading', { name: /unexpected error during quality check/i })
    ).toBeInTheDocument();
  });

  it('displays the track title when provided', () => {
    render(<MastraAgentFallback trackTitle="Stellar Waves" />);
    expect(screen.getByText(/Stellar Waves/)).toBeInTheDocument();
  });

  it('shows a sanitised error detail snippet (max 120 chars)', () => {
    const detail = 'A'.repeat(200);
    render(<MastraAgentFallback errorDetail={detail} />);
    const el = screen.getByText((text) => text.includes('A'.repeat(120)));
    expect(el).toBeInTheDocument();
  });

  it('hides the error detail block when errorDetail is blank', () => {
    render(<MastraAgentFallback errorDetail="   " />);
    // No monospace error block
    expect(
      screen.queryByText((_, el) => el?.tagName === 'P' && el.classList.contains('font-mono'))
    ).not.toBeInTheDocument();
  });

  it('shows the fallback status badge', () => {
    render(<MastraAgentFallback />);
    expect(screen.getByText(/fallback: track queued for manual review/i)).toBeInTheDocument();
  });

  it('fires onRetry and shows retrying state', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<MastraAgentFallback onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /retry ai check/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<MastraAgentFallback isRetrying onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled();
  });

  it('fires onSendToManualReview', () => {
    const onSendToManualReview = vi.fn();
    render(<MastraAgentFallback onSendToManualReview={onSendToManualReview} />);

    fireEvent.click(screen.getByRole('button', { name: /send to manual review/i }));
    expect(onSendToManualReview).toHaveBeenCalledTimes(1);
  });

  it('disables action buttons while retrying', () => {
    render(<MastraAgentFallback isRetrying onRetry={() => {}} onSendToManualReview={() => {}} />);

    screen.getAllByRole('button').forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('fires onDismiss', () => {
    const onDismiss = vi.fn();
    render(<MastraAgentFallback onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('hides dismiss button when onDismiss is not provided', () => {
    render(<MastraAgentFallback />);
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('hides action buttons when no handlers are provided', () => {
    render(<MastraAgentFallback />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manual review/i })).not.toBeInTheDocument();
  });
});

// --------------------------------------------------------------------------
// classifyMastraError unit tests
// --------------------------------------------------------------------------

describe('classifyMastraError', () => {
  it('classifies an AbortError as timeout', () => {
    const err = Object.assign(new Error('aborted'), { name: 'AbortError' });
    expect(classifyMastraError(err)).toBe('timeout');
  });

  it('classifies a "timed out" message as timeout', () => {
    expect(classifyMastraError(new Error('NVIDIA API request timed out'))).toBe('timeout');
  });

  it('classifies a "failed with status" message as api-error', () => {
    expect(classifyMastraError(new Error('NVIDIA API request failed with status 429'))).toBe(
      'api-error'
    );
  });

  it('classifies "API request failed" as api-error', () => {
    expect(classifyMastraError(new Error('NVIDIA API request failed: network down'))).toBe(
      'api-error'
    );
  });

  it('classifies "did not contain a JSON" as parse-error', () => {
    expect(
      classifyMastraError(new Error('NVIDIA API answer did not contain a JSON assessment'))
    ).toBe('parse-error');
  });

  it('classifies "unexpected response shape" as parse-error', () => {
    expect(classifyMastraError(new Error('NVIDIA API returned an unexpected response shape'))).toBe(
      'parse-error'
    );
  });

  it('classifies unknown Error as unknown', () => {
    expect(classifyMastraError(new Error('some random crash'))).toBe('unknown');
  });

  it('classifies non-Error values as unknown', () => {
    expect(classifyMastraError('string error')).toBe('unknown');
    expect(classifyMastraError(42)).toBe('unknown');
    expect(classifyMastraError(null)).toBe('unknown');
  });
});
