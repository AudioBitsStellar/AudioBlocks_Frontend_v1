import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FollowButton from '@/components/common/FollowButton';
import apiClient from '@/lib/apiClient';
import * as sessionModule from '@/lib/session';

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('FollowButton Component (#141)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(sessionModule, 'hasAuthSession').mockReturnValue(true);
  });

  it('renders loading state while follow status is being fetched on mount/refresh', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {})); // Never resolves

    renderWithClient(<FollowButton userId="artist-1" />);

    expect(screen.getByRole('button', { name: /loading follow status/i })).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders "Follow" when server returns not following', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { isFollowing: false } },
      status: 200,
      headers: new Headers(),
    });

    renderWithClient(<FollowButton userId="artist-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Follow' })).not.toBeDisabled();
  });

  it('renders "Following" when server returns isFollowing=true', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { isFollowing: true } },
      status: 200,
      headers: new Headers(),
    });

    renderWithClient(<FollowButton userId="artist-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Unfollow' })).toBeInTheDocument();
    });
    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  it('triggers follow action and transitions to Following state', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { isFollowing: false } },
      status: 200,
      headers: new Headers(),
    });
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true },
      status: 200,
      headers: new Headers(),
    });

    renderWithClient(<FollowButton userId="artist-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/users/artist-1/follow');
      expect(screen.getByRole('button', { name: 'Unfollow' })).toBeInTheDocument();
    });
  });

  it('does not render when user is signed out', () => {
    vi.spyOn(sessionModule, 'hasAuthSession').mockReturnValue(false);

    const { container } = renderWithClient(<FollowButton userId="artist-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
