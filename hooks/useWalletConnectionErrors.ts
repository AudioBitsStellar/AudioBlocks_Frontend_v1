'use client';

import { useDynamicEvents } from '@dynamic-labs/sdk-react-core';
import { toast } from 'sonner';
import { getWalletConnectionErrorMessage } from '@/lib/walletErrors';

/** Shared UI entry point for wallet provider connection callbacks. */
export function showWalletConnectionError(error: unknown): void {
  toast.error(getWalletConnectionErrorMessage(error));
}

/**
 * Displays a safe message when the wallet SDK cannot complete a connection.
 * This is mounted once at the provider boundary so all sign-in entry points
 * share the same handling and a failed connection cannot become an unhandled
 * UI error.
 */
export function useWalletConnectionErrors(): void {
  useDynamicEvents('walletConnectionFailed', (_walletConnector, error) => {
    showWalletConnectionError(error);
  });
}
