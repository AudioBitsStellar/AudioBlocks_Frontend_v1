import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useGetProfile, PROFILE_QUERY_KEY } from '@/hooks/useProfile';
import { getProfile } from '@/lib/profileService';
import type { UserProfile } from '@/lib/profileService';

vi.mock('@/lib/profileService', () => ({
  getProfile: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockGetProfile = vi.mocked(getProfile);

const mockProfile: UserProfile = {
  id: 'user-1',
  name: 'Alexia Stephen',
  username: 'alexia',
  email: 'alexia@example.com',
  bio: 'Producer and sound designer.',
  website: 'https://alexia.example.com',
  twitter: '@alexia',
  profileImage: '/dashboard/profiledefault.png',
  joinedAt: '2024-01-01T00:00:00Z',
  minutesListened: 4200,
  listenerType: 'power',
};

function createWrapper(queryClient?: QueryClient) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { Wrapper, client };
}

describe('useGetProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isLoading true on initial render', () => {
    mockGetProfile.mockReturnValue(new Promise(() => {})); // never resolves
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetProfile(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('returns profile data after a successful fetch', async () => {
    mockGetProfile.mockResolvedValue(mockProfile);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetProfile(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfile);
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });

  it('returns an error when the API call fails', async () => {
    const apiError = new Error('Profile not found');
    mockGetProfile.mockRejectedValue(apiError);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetProfile(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 2000 });
    expect(result.current.error).toEqual(apiError);
    expect(result.current.data).toBeUndefined();
  });

  it('updates the data after a refetch', async () => {
    mockGetProfile.mockResolvedValueOnce(mockProfile);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetProfile(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('Alexia Stephen');

    const updatedProfile: UserProfile = { ...mockProfile, name: 'Alexia S.' };
    mockGetProfile.mockResolvedValueOnce(updatedProfile);

    await result.current.refetch();

    await waitFor(() => expect(result.current.data?.name).toBe('Alexia S.'));
    expect(mockGetProfile).toHaveBeenCalledTimes(2);
  });

  it('returns cached data without a loading state on a cache hit', async () => {
    mockGetProfile.mockResolvedValue(mockProfile);
    const { Wrapper, client } = createWrapper();

    const first = renderHook(() => useGetProfile(), { wrapper: Wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(mockGetProfile).toHaveBeenCalledTimes(1);

    // Second hook instance shares the same QueryClient/cache and same query key,
    // so it should read cached data immediately without a loading state.
    const { Wrapper: SharedWrapper } = createWrapper(client);
    const second = renderHook(() => useGetProfile(), { wrapper: SharedWrapper });

    expect(second.result.current.isLoading).toBe(false);
    expect(second.result.current.data).toEqual(mockProfile);
    expect(mockGetProfile).toHaveBeenCalledTimes(1); // no extra fetch on cache hit
  });

  it('invalidating the cache triggers a refetch with fresh data', async () => {
    mockGetProfile.mockResolvedValueOnce(mockProfile);
    const { Wrapper, client } = createWrapper();

    const { result } = renderHook(() => useGetProfile(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const refreshedProfile: UserProfile = { ...mockProfile, minutesListened: 5000 };
    mockGetProfile.mockResolvedValueOnce(refreshedProfile);

    await client.invalidateQueries({ queryKey: PROFILE_QUERY_KEY, refetchType: 'none' });
    expect(client.getQueryState(PROFILE_QUERY_KEY)?.isInvalidated).toBe(true);

    // A new mount sharing the same (now-invalidated) cache should fetch fresh
    // data rather than serve the stale cached value.
    const { Wrapper: SharedWrapper } = createWrapper(client);
    const second = renderHook(() => useGetProfile(), { wrapper: SharedWrapper });

    await waitFor(() => expect(second.result.current.data?.minutesListened).toBe(5000));
    expect(mockGetProfile).toHaveBeenCalledTimes(2);
  });

  it('surfaces an appropriate error for a profile-not-found API response', async () => {
    const notFoundError = new Error('Invalid profile id');
    mockGetProfile.mockRejectedValue(notFoundError);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetProfile(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 2000 });
    expect((result.current.error as Error).message).toBe('Invalid profile id');
  });
});
