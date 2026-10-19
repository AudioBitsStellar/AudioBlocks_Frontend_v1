import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommunityTabs from '@/app/dashboard/community/_components/CommunityTabs';
import CommunityPage from '@/app/dashboard/community/page';
import apiClient from '@/lib/apiClient';

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

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
  notFoundMock.mockClear();
  getMock.mockReset();
  getMock.mockResolvedValue({ data: [] } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Community route feature flag (#637)', () => {
  it('returns the 404 page while the flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING', 'false');

    expect(() => CommunityPage()).toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('makes no community API calls while the flag is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING', 'false');

    renderWithQueryClient(<CommunityTabs />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getMock).not.toHaveBeenCalled();
  });

  it('renders the page again when the flag is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING', 'true');

    renderWithQueryClient(<CommunityPage />);

    expect(await screen.findByRole('heading', { name: 'Community' })).toBeInTheDocument();
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(getMock).toHaveBeenCalledWith('/api/community/leaderboard');
    expect(getMock).toHaveBeenCalledWith('/api/community/votes/me');
  });
});
