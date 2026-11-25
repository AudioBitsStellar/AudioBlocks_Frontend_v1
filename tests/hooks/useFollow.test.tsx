import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFollow } from '@/hooks/useFollow';
import apiClient from '@/lib/apiClient';
import * as sessionModule from '@/lib/session';

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return QueryWrapper;
}

describe('useFollow hook (#141)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(sessionModule, 'hasAuthSession').mockReturnValue(true);
  });

  it('matches server state on page load (isFollowing: true)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { isFollowing: true } },
      status: 200,
      headers: new Headers(),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFollow('artist-123'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFollowing).toBe(true);
    expect(apiClient.get).toHaveBeenCalledWith('/api/users/artist-123/following');
  });

  it('matches server state on page load (isFollowing: false)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { isFollowing: false } },
      status: 200,
      headers: new Headers(),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFollow('artist-123'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFollowing).toBe(false);
  });

  it('includes target user ID in query key to isolate cache across artists', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, data: { isFollowing: false } },
      status: 200,
      headers: new Headers(),
    });

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(({ id }) => useFollow(id), {
      wrapper,
      initialProps: { id: 'artist-1' },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(apiClient.get).toHaveBeenCalledWith('/api/users/artist-1/following');

    // Switch to artist-2
    rerender({ id: 'artist-2' });
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/users/artist-2/following');
    });
  });

  it('correctly follows and updates state after server action', async () => {
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

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFollow('artist-123'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isFollowing).toBe(false);

    await act(async () => {
      await result.current.toggleFollow();
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/users/artist-123/follow');
    await waitFor(() => expect(result.current.isFollowing).toBe(true));
  });

  it('correctly unfollows and updates state after server action', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, data: { isFollowing: true } },
      status: 200,
      headers: new Headers(),
    });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({
      data: { success: true },
      status: 200,
      headers: new Headers(),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFollow('artist-123'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isFollowing).toBe(true);

    await act(async () => {
      await result.current.toggleFollow();
    });

    expect(apiClient.delete).toHaveBeenCalledWith('/api/users/artist-123/follow');
    await waitFor(() => expect(result.current.isFollowing).toBe(false));
  });

  it('does not fetch or enable follow when user is signed out', () => {
    vi.spyOn(sessionModule, 'hasAuthSession').mockReturnValue(false);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFollow('artist-123'), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFollowing).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
