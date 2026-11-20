import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingPage from '@/app/onboarding/page';
import { AUTH_ROLES } from '@/lib/authRoles';
import { hasCompletedOnboarding, resetOnboarding } from '@/lib/onboarding';
import { updateAccountType } from '@/lib/profileService';

vi.mock('@/lib/profileService', () => ({
  updateAccountType: vi.fn(),
}));

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

const mockUpdateAccountType = vi.mocked(updateAccountType);

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

/** The page's own guard checks this cookie directly; set it to simulate an authenticated visitor. */
const signIn = () => {
  document.cookie = 'audioblocks_jwt=test-token';
};

describe('Onboarding page (#478, #596, #853)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    window.localStorage.clear();
    document.cookie = 'audioblocks_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    resetOnboarding();
  });

  afterEach(() => {
    document.cookie = 'audioblocks_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  });

  it('sends an unauthenticated visitor to the public landing page', async () => {
    renderWithQueryClient(<OnboardingPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('saves the listener role, marks onboarding complete, and returns to the original destination', async () => {
    signIn();
    mockSearchParams = new URLSearchParams('returnTo=/dashboard/library');
    mockUpdateAccountType.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithQueryClient(<OnboardingPage />);

    await user.click(screen.getByRole('button', { name: /listen & collect/i }));

    await waitFor(() => expect(mockUpdateAccountType).toHaveBeenCalledWith(AUTH_ROLES.LISTENER));
    await waitFor(() => expect(hasCompletedOnboarding()).toBe(true));
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/library');
  });

  it('defaults to /dashboard when no returnTo is given', async () => {
    signIn();
    mockUpdateAccountType.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithQueryClient(<OnboardingPage />);
    await user.click(screen.getByRole('button', { name: /listen & collect/i }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows the artist confirmation step instead of redirecting immediately', async () => {
    signIn();
    mockUpdateAccountType.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithQueryClient(<OnboardingPage />);
    await user.click(screen.getByRole('button', { name: /create & mint/i }));

    await waitFor(() => expect(mockUpdateAccountType).toHaveBeenCalledWith(AUTH_ROLES.ARTIST));
    expect(await screen.findByText(/you're set up as an artist/i)).toBeInTheDocument();
    // The redirect only happens once the user continues from this step.
    expect(mockReplace).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /continue to audioblocks/i }));
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('lets the user retry after a failed save, without losing the selected role', async () => {
    signIn();
    mockUpdateAccountType.mockRejectedValueOnce(new Error('network down'));
    mockUpdateAccountType.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    renderWithQueryClient(<OnboardingPage />);
    await user.click(screen.getByRole('button', { name: /listen & collect/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/couldn't save your choice/i);
    expect(mockReplace).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(mockUpdateAccountType).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
  });

  it('finishes onboarding without saving a role when skipped', async () => {
    signIn();
    const user = userEvent.setup();

    renderWithQueryClient(<OnboardingPage />);
    await user.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(mockUpdateAccountType).not.toHaveBeenCalled();
    expect(hasCompletedOnboarding()).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('disables both role buttons while a choice is being saved', async () => {
    signIn();
    let resolvePromise!: () => void;
    mockUpdateAccountType.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = () => resolve(undefined);
      })
    );
    const user = userEvent.setup();

    renderWithQueryClient(<OnboardingPage />);
    await user.click(screen.getByRole('button', { name: /listen & collect/i }));

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /create & mint/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /skip for now/i })).toBeDisabled();

    resolvePromise();
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
  });
});
