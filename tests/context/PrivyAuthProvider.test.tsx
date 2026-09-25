import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PrivyAuthProvider from '@/context/PrivyAuthProvider';

const mockPrivyProvider = vi.fn(({ children }: { children?: React.ReactNode }) => (
  <div data-testid="privy-provider">{children}</div>
));

vi.mock('@privy-io/react-auth', () => ({
  PrivyProvider: (props: { children?: React.ReactNode }) => mockPrivyProvider(props),
}));

describe('PrivyAuthProvider', () => {
  it('renders children inside PrivyProvider', () => {
    render(
      <PrivyAuthProvider>
        <div data-testid="child" />
      </PrivyAuthProvider>
    );

    expect(screen.getByTestId('privy-provider')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('passes the app id and login methods to PrivyProvider', () => {
    render(
      <PrivyAuthProvider>
        <div />
      </PrivyAuthProvider>
    );

    const props = mockPrivyProvider.mock.calls[0][0];
    expect(props.appId).toBe('');
    expect(props.config.loginMethods).toEqual(['email', 'google']);
    expect(props.config.embeddedWallets).toEqual({
      createOnLogin: 'users-without-wallets',
    });
  });
});
