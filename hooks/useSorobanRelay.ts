/**
 * Reusable hook for backend-relayed Soroban transactions
 * Issue #549: Create a prepare-sign-submit hook for Soroban transactions
 */

'use client';

import { useState, useCallback } from 'react';
import { useTransaction } from '@/context/TransactionContext';
import { getWalletConnectionErrorMessage, isUserCancellationError } from '@/lib/walletErrors';

export type SorobanRelayStatus =
  | 'idle'
  | 'preparing'
  | 'awaiting-signature'
  | 'submitting'
  | 'success'
  | 'error';

interface PrepareResponse {
  xdr: string;
  networkPassphrase: string;
  fee?: string;
}

interface SubmitResponse {
  txHash: string;
  [key: string]: unknown;
}

interface UseSorobanRelayOptions {
  prepare: () => Promise<PrepareResponse>;
  submit: (signedXdr: string) => Promise<SubmitResponse>;
  onSuccess?: (result: SubmitResponse) => void;
  onError?: (error: Error) => void;
}

interface UseSorobanRelayReturn {
  run: () => Promise<void>;
  status: SorobanRelayStatus;
  txHash: string | null;
  error: string | null;
  reset: () => void;
}

/**
 * Hook to handle the prepare → sign → submit flow for Soroban transactions
 * via the backend relay pattern
 */
export function useSorobanRelay({
  prepare,
  submit,
  onSuccess,
  onError,
}: UseSorobanRelayOptions): UseSorobanRelayReturn {
  const [status, setStatus] = useState<SorobanRelayStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addTransaction } = useTransaction();

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    try {
      setError(null);
      setStatus('preparing');

      // Step 1: Prepare transaction (backend assembles unsigned XDR)
      const prepareResult = await prepare();
      const { xdr, networkPassphrase } = prepareResult;

      if (!xdr || !networkPassphrase) {
        throw new Error('Invalid prepare response: missing xdr or networkPassphrase');
      }

      // Verify network matches configured network
      const configuredNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
      const expectedPassphrase =
        configuredNetwork === 'mainnet'
          ? 'Public Global Stellar Network ; September 2015'
          : 'Test SDF Network ; September 2015';

      if (networkPassphrase !== expectedPassphrase) {
        throw new Error(
          `Network mismatch: transaction is for ${networkPassphrase} but app is configured for ${expectedPassphrase}`
        );
      }

      setStatus('awaiting-signature');

      // Step 2: Sign transaction with user's wallet
      // In a real implementation, this would use the Stellar wallet context
      // For now, we'll simulate the signing step
      // TODO: Integrate with actual Stellar wallet context when available
      // const stellarWallet = useStellarWallet();
      // const signedXdr = await stellarWallet.signTransaction(xdr, networkPassphrase);

      // Placeholder for wallet integration
      throw new Error(
        'Wallet signing not yet implemented. Please integrate with Stellar wallet context.'
      );

      // Uncommenting below when wallet is integrated:
      // setStatus('submitting');

      // // Step 3: Submit signed transaction to backend
      // const submitResult = await submit(signedXdr);

      // if (!submitResult.txHash) {
      //   throw new Error('Invalid submit response: missing txHash');
      // }

      // setTxHash(submitResult.txHash);
      // setStatus('success');

      // // Register transaction in TransactionContext for tracking
      // addTransaction(submitResult.txHash, 'buy'); // Type will depend on the transaction

      // if (onSuccess) {
      //   onSuccess(submitResult);
      // }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? isUserCancellationError(err)
            ? getWalletConnectionErrorMessage(err)
            : err.message
          : 'Transaction failed';

      setError(errorMessage);
      setStatus('error');

      if (onError && err instanceof Error) {
        onError(err);
      }
    }
    // Dependencies intentionally minimal to avoid unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepare]);

  return {
    run,
    status,
    txHash,
    error,
    reset,
  };
}
