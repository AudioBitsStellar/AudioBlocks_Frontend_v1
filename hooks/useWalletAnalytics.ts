'use client';

import { useEffect, useRef } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAccount } from 'wagmi';
import { trackEvent } from '@/lib/analytics';

/**
 * Tracks wallet connect/disconnect events for analytics (#323).
 *
 * Fires a `wallet_connect` event when the account transitions to connected and
 * a `wallet_disconnect` event when it transitions back to disconnected. The
 * initial mount is skipped so page reloads with a persisted session don't
 * inflate connect counts — only real transitions are recorded.
 *
 * Mount once at the app root (inside the wallet providers); see
 * `context/provider.tsx`.
 */
export function useWalletAnalytics(): void {
  const { address, isConnected, chainId, connector } = useAccount();
  const { user } = useDynamicContext();
  const previousConnected = useRef<boolean | null>(null);
  const previousAddress = useRef<string | null | undefined>(undefined);
  const previousChainId = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    // First run: record the baseline state without tracking.
    if (previousConnected.current === null) {
      previousConnected.current = isConnected;
      previousAddress.current = address;
      previousChainId.current = chainId;
      return;
    }

    const changedToConnected = isConnected && !previousConnected.current;
    const changedToDisconnected = !isConnected && previousConnected.current;
    // On disconnect the account has already been cleared, so report the last
    // known connected address/chain from the previous render.
    const lastAddress = previousAddress.current;
    const lastChainId = previousChainId.current;
    previousConnected.current = isConnected;
    previousAddress.current = address;
    previousChainId.current = chainId;

    if (changedToConnected) {
      trackEvent('wallet_connect', {
        address: address ?? null,
        chainId: chainId ?? null,
        walletProvider: connector?.name ?? 'unknown',
        isNewUser: Boolean(
          user && user.verifiedCredentials && user.verifiedCredentials.length === 0
        ),
        timestamp: new Date().toISOString(),
      });
    } else if (changedToDisconnected) {
      trackEvent('wallet_disconnect', {
        address: lastAddress ?? null,
        chainId: lastChainId ?? null,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isConnected, address, chainId, connector, user]);
}
