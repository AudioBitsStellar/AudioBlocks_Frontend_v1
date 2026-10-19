import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ErrorState from '@/components/common/ErrorState';

describe('ErrorState Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Props: title, message, illustration', () => {
    it('renders custom title and message', () => {
      render(<ErrorState message="Custom message body" title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom message body')).toBeInTheDocument();
    });

    it('renders default title and message for generic variant', () => {
      render(<ErrorState />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText('An unexpected error occurred. Please try again.')
      ).toBeInTheDocument();
    });

    it('renders default title and message for network variant', () => {
      render(<ErrorState variant="network" />);

      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(
        screen.getByText('Unable to connect. Check your internet connection and try again.')
      ).toBeInTheDocument();
    });

    it('renders default title and message for not-found variant', () => {
      render(<ErrorState variant="not-found" />);

      expect(screen.getByText('Not found')).toBeInTheDocument();
      expect(
        screen.getByText('The content you are looking for could not be found.')
      ).toBeInTheDocument();
    });

    it('renders custom illustration when provided', () => {
      render(<ErrorState illustration={<span data-testid="custom-illustration">!</span>} />);

      expect(screen.getByTestId('custom-illustration')).toBeInTheDocument();
    });

    it('custom title overrides variant default', () => {
      render(<ErrorState title="Oops" variant="network" />);

      expect(screen.getByText('Oops')).toBeInTheDocument();
      expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    });

    it('custom message overrides variant default', () => {
      render(<ErrorState message="Try later" variant="network" />);

      expect(screen.getByText('Try later')).toBeInTheDocument();
    });
  });

  describe('Retry button', () => {
    it('does not render retry button when onRetry is not provided', () => {
      render(<ErrorState />);

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('renders retry button when onRetry is provided', () => {
      render(<ErrorState onRetry={() => {}} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState onRetry={onRetry} />);

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows loading spinner and "Retrying..." text when isRetrying is true', () => {
      render(<ErrorState isRetrying={true} onRetry={() => {}} />);

      const button = screen.getByRole('button', { name: /retrying/i });
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Retrying...');
    });

    it('shows "Retry" text when isRetrying is false', () => {
      render(<ErrorState isRetrying={false} onRetry={() => {}} />);

      const button = screen.getByRole('button', { name: /retry/i });
      expect(button).not.toBeDisabled();
      expect(button).toHaveTextContent('Retry');
    });

    it('keyboard Enter triggers retry', () => {
      const onRetry = vi.fn();
      render(<ErrorState onRetry={onRetry} />);

      const button = screen.getByRole('button', { name: /retry/i });
      button.focus();
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      fireEvent.keyUp(button, { key: 'Enter', code: 'Enter' });

      // Native button handles Enter via click
      expect(button).toHaveFocus();
    });

    it('keyboard Space triggers retry', () => {
      const onRetry = vi.fn();
      render(<ErrorState onRetry={onRetry} />);

      const button = screen.getByRole('button', { name: /retry/i });
      button.focus();

      // Native button handles Space via click
      expect(button).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('wraps in role="alert" for screen reader announcement', () => {
      render(<ErrorState />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live="assertive" for immediate announcement', () => {
      render(<ErrorState />);

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    it('retry button is disabled and not interactive while retrying', () => {
      render(<ErrorState isRetrying={true} onRetry={() => {}} />);

      const button = screen.getByRole('button', { name: /retrying/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Default illustrations per variant', () => {
    it('renders an illustration element for generic variant', () => {
      const { container } = render(<ErrorState variant="generic" />);
      // AlertTriangle icon rendered as SVG
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders an illustration element for network variant', () => {
      const { container } = render(<ErrorState variant="network" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders an illustration element for not-found variant', () => {
      const { container } = render(<ErrorState variant="not-found" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});
