import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';

const ProblemChild = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test component crashed');
  }
  return <div>Normal Content</div>;
};

describe('SectionErrorBoundary Component', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <SectionErrorBoundary>
        <div>Normal Content</div>
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('renders error state when child throws', () => {
    render(
      <SectionErrorBoundary sectionName="User Profile">
        <ProblemChild shouldThrow={true} />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('User Profile Error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry loading user profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload entire page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact support/i })).toBeInTheDocument();
  });

  it('toggles technical details display', () => {
    render(
      <SectionErrorBoundary sectionName="Player">
        <ProblemChild shouldThrow={true} />
      </SectionErrorBoundary>
    );

    const toggleButton = screen.getByRole('button', { name: /show technical details/i });
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.getByText(/Test component crashed/i)).toBeInTheDocument();

    const hideButton = screen.getByRole('button', { name: /hide technical details/i });
    fireEvent.click(hideButton);
    expect(screen.queryByText(/Test component crashed/i)).not.toBeInTheDocument();
  });

  it('handles retry action', () => {
    const onRetryMock = vi.fn();
    const { rerender } = render(
      <SectionErrorBoundary onRetry={onRetryMock} sectionName="Marketplace">
        <ProblemChild shouldThrow={true} />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Marketplace Error')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry loading marketplace/i });
    fireEvent.click(retryButton);

    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });
});
