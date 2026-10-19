import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '@/app/dashboard/profile/page';
import { AuthError, NotFoundError } from '@/lib/apiClient';

const mocks = vi.hoisted(() => ({
  useGetProfile: vi.fn(),
  logout: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/hooks/useProfile', () => ({ useGetProfile: mocks.useGetProfile }));
vi.mock('@/hooks/useLogout', () => ({
  useLogout: () => ({ logout: mocks.logout, isLoggingOut: false }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

const refetch = vi.fn();

const queryState = (over: Record<string, unknown>) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  isRefetching: false,
  error: null,
  refetch,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProfilePage states (#750)', () => {
  it('shows a labelled skeleton while loading', () => {
    mocks.useGetProfile.mockReturnValue(queryState({ isLoading: true }));
    render(<ProfilePage />);

    expect(screen.getByRole('status', { name: 'Loading profile' })).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('renders the profile once loaded', () => {
    mocks.useGetProfile.mockReturnValue(
      queryState({ data: { name: 'Alexia', joinedAt: '2024-01-01T00:00:00Z' } })
    );
    render(<ProfilePage />);

    expect(screen.getByRole('heading', { name: 'Alexia' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('401: asks the user to sign in again and runs logout', () => {
    mocks.useGetProfile.mockReturnValue(queryState({ isError: true, error: new AuthError() }));
    render(<ProfilePage />);

    expect(screen.getByRole('alert')).toHaveTextContent(/session has expired/i);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }));
    expect(mocks.logout).toHaveBeenCalledWith({ redirectTo: '/', showToast: false });
  });

  it('404: sends the user to finish setting up their profile', () => {
    mocks.useGetProfile.mockReturnValue(queryState({ isError: true, error: new NotFoundError() }));
    render(<ProfilePage />);

    expect(
      screen.getByRole('heading', { name: 'Finish setting up your profile' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up profile' })).toHaveAttribute(
      'href',
      '/dashboard/profile/edit'
    );
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('500: offers a retry that refetches without reloading', () => {
    mocks.useGetProfile.mockReturnValue(
      queryState({ isError: true, error: new Error('Request failed with 500') })
    );
    render(<ProfilePage />);

    expect(screen.getByRole('heading', { name: 'Failed to load profile' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('disables the retry button while a refetch is in flight', () => {
    mocks.useGetProfile.mockReturnValue(
      queryState({ isError: true, error: new Error('boom'), isRefetching: true })
    );
    render(<ProfilePage />);

    expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled();
  });
});
