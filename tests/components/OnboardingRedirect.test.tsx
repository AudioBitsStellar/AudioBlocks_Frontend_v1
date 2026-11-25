import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingRedirect from '@/components/auth/OnboardingRedirect';
import { hasCompletedOnboarding, markOnboardingComplete, resetOnboarding } from '@/lib/onboarding';
import { getProfile } from '@/lib/profileService';

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: vi.fn(),
}));

vi.mock('@/lib/profileService', () => ({
  getProfile: vi.fn(),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/dashboard',
}));

const mockUseDynamicContext = vi.mocked(useDynamicContext);
const mockGetProfile = vi.mocked(getProfile);

describe('OnboardingRedirect (#478, #596, #712)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockGetProfile.mockResolvedValue({ id: 'u1', name: 'Test' } as never);
  });

  it('redirects an authenticated first-time user to /onboarding', async () => {
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'u1' } } as never);
    resetOnboarding('u1'); // flag explicitly incomplete

    render(<OnboardingRedirect />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/onboarding?returnTo='));
    });
    expect(mockReplace).toHaveBeenCalledWith(
      `/onboarding?returnTo=${encodeURIComponent('/dashboard')}`
    );
  });

  it('an existing user with a saved role signing in on a fresh browser lands on the dashboard, not /onboarding (#712)', async () => {
    // Fresh browser: localStorage is completely empty
    expect(window.localStorage.length).toBe(0);
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'existing-user' } } as never);
    mockGetProfile.mockResolvedValue({
      id: 'existing-user',
      name: 'Existing',
      accountType: 'listener',
    } as never);

    render(<OnboardingRedirect />);

    await waitFor(() => expect(hasCompletedOnboarding('existing-user')).toBe(true));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('a brand-new user without a role is still sent to /onboarding (#712)', async () => {
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'new-user' } } as never);
    mockGetProfile.mockResolvedValue({
      id: 'new-user',
      name: 'New User',
      accountType: undefined,
    } as never);

    render(<OnboardingRedirect />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/onboarding?returnTo='));
    });
    expect(hasCompletedOnboarding('new-user')).toBe(false);
  });

  it('does not redirect until the profile query settles (#712)', async () => {
    let resolveProfile: (val: unknown) => void = () => {};
    const deferredProfile = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'u-deferred' } } as never);
    mockGetProfile.mockReturnValue(deferredProfile as never);

    render(<OnboardingRedirect />);

    // Before query settles, does nothing (shows nothing in the meantime)
    expect(mockReplace).not.toHaveBeenCalled();

    // Query settles with role
    resolveProfile({ id: 'u-deferred', accountType: 'artist' });
    await waitFor(() => expect(hasCompletedOnboarding('u-deferred')).toBe(true));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('two users sharing a browser do not share onboarding completion cache (#712)', async () => {
    // User A finished onboarding
    markOnboardingComplete('user-a');
    expect(hasCompletedOnboarding('user-a')).toBe(true);

    // User B is brand new and signs in on the same browser
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'user-b' } } as never);
    mockGetProfile.mockResolvedValue({ id: 'user-b', name: 'User B', accountType: undefined } as never);

    render(<OnboardingRedirect />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/onboarding?returnTo='));
    });
  });

  it('still redirects when the profile lookup fails (#596)', async () => {
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'u1' } } as never);
    mockGetProfile.mockRejectedValue(new Error('network down'));
    resetOnboarding('u1');

    render(<OnboardingRedirect />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/onboarding?returnTo='));
    });
  });

  it('does nothing once onboarding has been cached for the user', async () => {
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'u1' } } as never);
    markOnboardingComplete('u1');

    render(<OnboardingRedirect />);

    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });

  it('does nothing for unauthenticated visitors', async () => {
    mockUseDynamicContext.mockReturnValue({ user: null } as never);
    resetOnboarding();

    render(<OnboardingRedirect />);

    await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
  });

  it('never renders UI of its own', () => {
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'u1' } } as never);
    const { container } = render(<OnboardingRedirect />);
    expect(container).toBeEmptyDOMElement();
  });
});
