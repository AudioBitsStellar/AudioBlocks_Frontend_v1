'use client';

import { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

interface PrivyAuthProviderProps {
  children?: ReactNode;
}

let loggedMissingAppId = false;

/**
 * Checks whether Privy authentication is enabled and properly configured with an app ID.
 * Reads environment variables through literal property access for Next.js bundler inlining.
 */
export function isPrivyEnabled(): boolean {
  const isEnabled = process.env.NEXT_PUBLIC_USE_PRIVY_AUTH === 'true';
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  return isEnabled && Boolean(appId && appId.trim().length > 0);
}

export default function PrivyAuthProvider({ children }: PrivyAuthProviderProps) {
  const isEnabled = process.env.NEXT_PUBLIC_USE_PRIVY_AUTH === 'true';
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() || '';

  if (isEnabled && !appId) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        '[PrivyAuthProvider] NEXT_PUBLIC_USE_PRIVY_AUTH=true but NEXT_PUBLIC_PRIVY_APP_ID is missing.'
      );
    } else if (!loggedMissingAppId) {
      loggedMissingAppId = true;
      console.warn(
        '[PrivyAuthProvider] NEXT_PUBLIC_USE_PRIVY_AUTH=true but NEXT_PUBLIC_PRIVY_APP_ID is missing.'
      );
    }
  }

  // When Privy is not enabled or lacks an app ID, mount children without PrivyProvider
  if (!isEnabled || !appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
