import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useUserProfile, getInitials, getVersionedAvatarUrl } from '@/hooks/queries/users';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('getInitials', () => {
  it('returns first and last initials for a full name', () => {
    expect(getInitials('Alexia Stephen')).toBe('AS');
  });

  it('returns a single initial for a single-word name', () => {
    expect(getInitials('Prince')).toBe('P');
  });

  it('returns an empty string for blank input', () => {
    expect(getInitials('   ')).toBe('');
  });
});

describe('getVersionedAvatarUrl', () => {
  it('appends a version query param', () => {
    expect(getVersionedAvatarUrl('/avatar.jpg', '2024-03-15T10:30:00Z')).toBe(
      '/avatar.jpg?v=2024-03-15T10%3A30%3A00Z'
    );
  });

  it('uses & when the avatar URL already has a query string', () => {
    expect(getVersionedAvatarUrl('/avatar.jpg?w=200', '2024-01-01T00:00:00Z')).toBe(
      '/avatar.jpg?w=200&v=2024-01-01T00%3A00%3A00Z'
    );
  });
});

describe('useUserProfile', () => {
  it('resolves profile data with a versioned avatar and initials', async () => {
    const { result } = renderHook(() => useUserProfile('user-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.name).toBe('Alexia Stephen');
    expect(result.current.avatarUrl).toContain('v=');
    expect(result.current.initials).toBe('AS');
  });

  it('sets isCurrentUser when currentUserId matches the requested profile', async () => {
    const { result } = renderHook(() => useUserProfile('user-1', 'user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isCurrentUser).toBe(true);
  });

  it('sets isCurrentUser to false for another viewer', async () => {
    const { result } = renderHook(() => useUserProfile('user-1', 'user-2'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isCurrentUser).toBe(false);
  });

  it('surfaces an error for an unknown user id', async () => {
    const { result } = renderHook(() => useUserProfile('unknown-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 2000 });
    expect(result.current.avatarUrl).toBeUndefined();
  });

  it('does not fetch when userId is empty', () => {
    const { result } = renderHook(() => useUserProfile(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
