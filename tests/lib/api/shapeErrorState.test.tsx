import { Component, type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { createQueryClient } from '@/lib/queryClient';
import { getMerchListings } from '@/lib/exploreService';

vi.mock('@/lib/apiClient', () => ({ default: { get: vi.fn() } }));

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <p role="alert">{this.state.error.name}</p> : this.props.children;
  }
}

function MerchList() {
  const { data } = useQuery({ queryKey: ['merch'], queryFn: getMerchListings });
  if (!data) return <p>Loading</p>;
  return data.length === 0 ? <p>No merch yet</p> : <p>{data.length} items</p>;
}

describe('API shape mismatch (#564)', () => {
  it('shows an error state, not an empty list', async () => {
    // Wrong endpoint / error body: no { data } envelope.
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { error: 'Not Found' } } as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <QueryClientProvider client={createQueryClient()}>
        <Boundary>
          <MerchList />
        </Boundary>
      </QueryClientProvider>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('ApiShapeError');
    expect(screen.queryByText('No merch yet')).toBeNull();
    // No retries for a shape error.
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
