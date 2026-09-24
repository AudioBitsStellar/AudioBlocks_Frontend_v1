import { useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingRedirect from '@/components/auth/OnboardingRedirect';
import { markOnboardingComplete, resetOnboarding } from '@/lib/onboarding';

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: vi.fn(),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/dashboard',
}));

const mockUseDynamicContext = vi.mocked(useDynamicContext);

describe('OnboardingRedirect (#478)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
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
