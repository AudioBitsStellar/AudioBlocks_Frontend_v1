import { useRouter } from 'next/navigation';
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

describe('OnboardingRedirect (#478)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockGetProfile.mockResolvedValue({ id: 'u1', name: 'Test' } as never);
  });

  it('redirects an authenticated first-time user to /onboarding', async () => {
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'u1' } } as never);
    resetOnboarding(); // flag explicitly incomplete

    render(<OnboardingRedirect />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/onboarding?returnTo='));
    });
    expect(mockReplace).toHaveBeenCalledWith(
      `/onboarding?returnTo=${encodeURIComponent('/dashboard')}`
    );
  });

  it('skips onboarding when the backend already has a role for the user (#596)', async () => {
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'u1' } } as never);
    mockGetProfile.mockResolvedValue({ id: 'u1', name: 'Test', accountType: 'artist' } as never);
    resetOnboarding();

    render(<OnboardingRedirect />);

    await waitFor(() => expect(hasCompletedOnboarding()).toBe(true));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('still redirects when the profile lookup fails (#596)', async () => {
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'u1' } } as never);
    mockGetProfile.mockRejectedValue(new Error('network down'));
    resetOnboarding();

    render(<OnboardingRedirect />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('/onboarding?returnTo='));
    });
  });

  it('does nothing once onboarding has been completed', async () => {
    mockUseDynamicContext.mockReturnValue({ user: { userId: 'u1' } } as never);
    markOnboardingComplete();

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
