import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PrivyAuthProvider, { isPrivyEnabled } from '@/context/PrivyAuthProvider';

const mockPrivyProvider = vi.fn(({ children }: { children?: React.ReactNode }) => (
  <div data-testid="privy-provider">{children}</div>
));

vi.mock('@privy-io/react-auth', () => ({
  PrivyProvider: (props: { children?: React.ReactNode }) => mockPrivyProvider(props),
}));

describe('PrivyAuthProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('renders children directly without PrivyProvider when NEXT_PUBLIC_USE_PRIVY_AUTH is not set', () => {
    delete process.env.NEXT_PUBLIC_USE_PRIVY_AUTH;
    delete process.env.NEXT_PUBLIC_PRIVY_APP_ID;

    render(
      <PrivyAuthProvider>
        <div data-testid="child">Child Content</div>
      </PrivyAuthProvider>
    );

    expect(isPrivyEnabled()).toBe(false);
    expect(screen.queryByTestId('privy-provider')).not.toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders children directly without PrivyProvider when NEXT_PUBLIC_USE_PRIVY_AUTH is false', () => {
    process.env.NEXT_PUBLIC_USE_PRIVY_AUTH = 'false';
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'privy_app_123';

    render(
      <PrivyAuthProvider>
        <div data-testid="child">Child Content</div>
      </PrivyAuthProvider>
    );

    expect(isPrivyEnabled()).toBe(false);
    expect(screen.queryByTestId('privy-provider')).not.toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('mounts PrivyProvider with configured appId when enabled and app ID is present', () => {
    process.env.NEXT_PUBLIC_USE_PRIVY_AUTH = 'true';
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'privy_app_test_123';

    render(
      <PrivyAuthProvider>
        <div data-testid="child">Child Content</div>
      </PrivyAuthProvider>
    );

    expect(isPrivyEnabled()).toBe(true);
    expect(screen.getByTestId('privy-provider')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();

    const props = mockPrivyProvider.mock.calls[0][0];
    expect(props.appId).toBe('privy_app_test_123');
    expect(props.config.loginMethods).toEqual(['email', 'google']);
  });

  it('logs error in development when enabled without an app ID', () => {
    process.env.NEXT_PUBLIC_USE_PRIVY_AUTH = 'true';
    delete process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PrivyAuthProvider>
        <div data-testid="child">Child Content</div>
      </PrivyAuthProvider>
    );

    expect(isPrivyEnabled()).toBe(false);
    expect(screen.queryByTestId('privy-provider')).not.toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
  });
});
