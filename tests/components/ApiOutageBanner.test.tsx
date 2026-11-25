import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApiOutageBanner from '@/components/ApiOutageBanner';
import {
  OUTAGE_FAILURE_THRESHOLD,
  recordApiFailure,
  recordApiSuccess,
  resetApiOutageState,
} from '@/lib/apiOutage';

function renderBanner(client = new QueryClient()) {
  return render(
    <QueryClientProvider client={client}>
      <ApiOutageBanner />
    </QueryClientProvider>
  );
}

function simulateOutage() {
  act(() => {
    for (let i = 0; i < OUTAGE_FAILURE_THRESHOLD; i++) recordApiFailure();
  });
}

beforeEach(() => {
  resetApiOutageState();
});

describe('ApiOutageBanner (#816)', () => {
  it('renders nothing while the API is reachable', () => {
    renderBanner();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the notice during an outage and hides it when the API answers again', () => {
    renderBanner();

    simulateOutage();
    expect(screen.getByRole('status')).toHaveTextContent('cannot reach its servers');

    act(() => recordApiSuccess());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('"Retry now" refetches the active queries without leaving the page', () => {
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
    renderBanner(client);
    simulateOutage();

    fireEvent.click(screen.getByRole('button', { name: 'Retry now' }));

    expect(refetch).toHaveBeenCalledWith({ type: 'active' });
  });
});
