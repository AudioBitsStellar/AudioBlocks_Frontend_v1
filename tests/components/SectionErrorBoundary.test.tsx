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

const ThrowValue = ({ value }: { value: unknown }) => {
  throw value;
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
    expect(screen.getAllByText(/Test component crashed/i).length).toBeGreaterThan(1);

    const hideButton = screen.getByRole('button', { name: /hide technical details/i });
    fireEvent.click(hideButton);
    expect(screen.getAllByText(/Test component crashed/i).length).toBe(1);
  });

  it('handles retry action', () => {
    const onRetryMock = vi.fn();
    const { rerender } = render(
      <SectionErrorBoundary sectionName="Marketplace" onRetry={onRetryMock}>
        <ProblemChild shouldThrow={true} />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Marketplace Error')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry loading marketplace/i });
    fireEvent.click(retryButton);

    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it('shows a fallback message and does not crash when a null error is thrown', () => {
    render(
      <SectionErrorBoundary sectionName="Player">
        <ThrowValue value={null} />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Player Error')).toBeInTheDocument();
    expect(screen.getByText('An unknown error occurred')).toBeInTheDocument();
  });

  it('shows a fallback message and does not crash when an undefined error is thrown', () => {
    render(
      <SectionErrorBoundary sectionName="Player">
        <ThrowValue value={undefined} />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Player Error')).toBeInTheDocument();
    expect(screen.getByText('An unknown error occurred')).toBeInTheDocument();
  });

  it('handles a thrown string without crashing', () => {
    render(
      <SectionErrorBoundary sectionName="Player">
        <ThrowValue value="plain string failure" />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Player Error')).toBeInTheDocument();
    expect(screen.getByText('plain string failure')).toBeInTheDocument();
  });

  it('handles a thrown number without crashing', () => {
    render(
      <SectionErrorBoundary sectionName="Player">
        <ThrowValue value={42} />
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Player Error')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
