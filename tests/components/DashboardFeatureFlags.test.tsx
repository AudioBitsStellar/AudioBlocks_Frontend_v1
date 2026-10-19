import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventSection from '@/components/common/dashboard/EventSection';
import Merch from '@/components/common/dashboard/Merch';
import apiClient from '@/lib/apiClient';

// react-slick (imported by Merch/EventSection) touches matchMedia at module load.
vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

beforeEach(() => {
  getMock.mockReset();
  getMock.mockResolvedValue({ data: [] } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Explore sections behind feature flags (#637)', () => {
  it('renders neither section and makes no request while both flags are off', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MERCH', 'false');
    vi.stubEnv('NEXT_PUBLIC_FEATURE_EVENTS', 'false');

    renderWithQueryClient(
      <>
        <EventSection />
        <Merch />
      </>
    );

    // Give React Query a chance to start any (unexpected) fetch.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText('Merch')).not.toBeInTheDocument();
    expect(screen.queryByText('Event')).not.toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('restores the merch section and requests /api/merch when its flag is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MERCH', 'true');
    vi.stubEnv('NEXT_PUBLIC_FEATURE_EVENTS', 'false');

    renderWithQueryClient(<Merch />);

    expect(await screen.findByText('No merch available yet.')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/api/merch');
    expect(getMock.mock.calls.some(([url]) => url === '/api/events')).toBe(false);
  });

  it('restores the events section and requests /api/events when its flag is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MERCH', 'false');
    vi.stubEnv('NEXT_PUBLIC_FEATURE_EVENTS', 'true');

    renderWithQueryClient(<EventSection />);

    expect(await screen.findByText('No upcoming events yet.')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/api/events');
    expect(getMock.mock.calls.some(([url]) => url === '/api/merch')).toBe(false);
  });
});
