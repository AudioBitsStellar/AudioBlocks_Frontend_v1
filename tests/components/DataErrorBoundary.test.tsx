import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';

function Boom({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) throw new Error('section blew up');
  return <div>section content</div>;
}

/** Parent that stops throwing once the boundary's onRetry fires. */
function RetryHarness({ onRetrySpy }: { onRetrySpy: () => void }) {
  const [fail, setFail] = useState(true);
  return (
    <DataErrorBoundary
      name="Collections"
      onRetry={() => {
        onRetrySpy();
        setFail(false);
      }}
    >
      <Boom shouldThrow={fail} />
    </DataErrorBoundary>
  );
}

describe('DataErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders its children when nothing throws', () => {
    render(
      <DataErrorBoundary name="Collections">
        <Boom shouldThrow={false} />
      </DataErrorBoundary>
    );
    expect(screen.getByText('section content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the shared ErrorState with a retry button when a child throws', () => {
    render(
      <DataErrorBoundary name="Collections">
        <Boom shouldThrow />
      </DataErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Collections failed to load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry and remounts the subtree when Retry is clicked', () => {
    const onRetry = vi.fn();
    render(<RetryHarness onRetrySpy={onRetry} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText('section content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('isolates a failing section — sibling boundaries keep rendering', () => {
    render(
      <div>
        <DataErrorBoundary name="Collections">
          <Boom shouldThrow />
        </DataErrorBoundary>
        <DataErrorBoundary name="Artists">
          <Boom shouldThrow={false} />
        </DataErrorBoundary>
      </div>
    );

    expect(screen.getByText('Collections failed to load')).toBeInTheDocument();
    expect(screen.getByText('section content')).toBeInTheDocument();
  });

  it('falls back to the generic ErrorState copy when no name is given', () => {
    render(
      <DataErrorBoundary>
        <Boom shouldThrow />
      </DataErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('supports the network variant', () => {
    render(
      <DataErrorBoundary name="Events" variant="network">
        <Boom shouldThrow />
      </DataErrorBoundary>
    );
    expect(screen.getByText('Events failed to load')).toBeInTheDocument();
    expect(screen.getByText(/we couldn't load events/i)).toBeInTheDocument();
  });
});
