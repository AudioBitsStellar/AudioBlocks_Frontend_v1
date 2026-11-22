'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTransaction } from '@/context/TransactionContext';
import { useStellarWallet } from '@/context/StellarWalletContext';
import { getWalletSigningErrorMessage } from '@/lib/walletErrors';
import { purchaseStorageKey, readPurchaseAttempt, reconcilePurchase, type PurchaseAttempt } from '@/lib/purchaseAttempt';
import { getWalletConnectionErrorMessage, isUserCancellationError } from '@/lib/walletErrors';
import { checkChainSafety } from '@/lib/chainSafety';

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

export type SorobanRelayStatus = 'idle' | 'preparing' | 'awaiting-signature' | 'submitting' | 'pending' | 'success' | 'error';
interface PrepareResponse { xdr: string; networkPassphrase: string; fee?: string }
interface SubmitResponse { txHash: string; [key: string]: unknown }
interface UseSorobanRelayOptions {
  prepare: (idempotencyKey?: string) => Promise<PrepareResponse>;
  submit: (signedXdr: string, idempotencyKey?: string) => Promise<SubmitResponse>;
  purchaseTokenId?: string;
  onSuccess?: (result: SubmitResponse) => void;
  onError?: (error: Error) => void;
}
const activeScopes = new Set<string>();

export function useSorobanRelay({ prepare, submit, purchaseTokenId, onSuccess, onError }: UseSorobanRelayOptions) {
  const [status, setStatus] = useState<SorobanRelayStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const completedScope = useRef<string | null>(null);
  const { addTransaction } = useTransaction();
  const { publicKey, network, signTransaction } = useStellarWallet();
  const scope = publicKey && purchaseTokenId ? purchaseStorageKey(network, publicKey, purchaseTokenId) : null;
  const identity = `${network}:${publicKey}:${purchaseTokenId ?? ''}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const callbacks = useRef({ onSuccess, onError, addTransaction });
  callbacks.current = { onSuccess, onError, addTransaction };
  const pending = status === 'pending';

  useEffect(() => {
    completedScope.current = null;
    setStatus('idle'); setError(null); setTxHash(null);
  }, [scope]);

  // Recovery never signs or submits again. Only server truth unlocks a retry.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checking = false;
    const check = async () => {
      if (!scope || completedScope.current === scope || checking || activeScopes.has(scope)) return;
      checking = true;
      try {
        const attempt = readPurchaseAttempt(scope);
        if (!attempt) return;
        if (!cancelled) setStatus('pending');
        const result = await reconcilePurchase(attempt);
        if (cancelled) return;
        // Another tab may have replaced a definitively failed attempt while this request ran.
        if (readPurchaseAttempt(scope)?.key !== attempt.key) return;
        if (result.status === 'confirmed' && result.txHash) {
          completedScope.current = scope;
          // Keep the receipt to guard purchases across another reload.
          localStorage.setItem(scope, JSON.stringify({ ...attempt, txHash: result.txHash }));
          setTxHash(result.txHash); setStatus('success'); setError(null);
          callbacks.current.addTransaction(result.txHash, 'buy', true);
          callbacks.current.onSuccess?.({ txHash: result.txHash });
          return;
        }
        if (result.status === 'failed') {
          localStorage.removeItem(scope);
          setStatus('error'); setError('The server confirmed this purchase failed. You can try again.');
          return;
        }
        setError('Purchase pending. Waiting for server confirmation. Do not buy again.');
      } catch (err) {
        if (!cancelled) {
          setStatus('pending');
          setError(err instanceof Error ? err.message : 'Unable to check purchase status.');
        }
      } finally { checking = false; }
      if (!cancelled) timer = setTimeout(check, 5000);
    };
    void check();
    const refresh = () => { if (timer) clearTimeout(timer); void check(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [scope, pending]);

  const reset = useCallback(() => {
    if (busy.current || status === 'pending' || status === 'success') return;
    setStatus('idle'); setError(null);
  }, [status]);

  const run = useCallback(async () => {
    if (busy.current || status === 'pending' || status === 'success') return;
    busy.current = true;
    let attempt: PurchaseAttempt | null = null;
    let submitStarted = false;
    let ownsScope = false;
    const execute = async () => {
      try {
        if (!publicKey) throw new Error('Connect your Stellar wallet before continuing.');
        if (scope) {
          if (activeScopes.has(scope)) return;
          if (readPurchaseAttempt(scope)) { setStatus('pending'); return; }
          activeScopes.add(scope); ownsScope = true;
          attempt = { key: crypto.randomUUID() };
          localStorage.setItem(scope, JSON.stringify(attempt));
        }
        setError(null); setStatus('preparing');
        const prepared = await prepare(attempt?.key);
        if (currentIdentity.current !== identity) throw new Error('Wallet changed. Confirm your account before trying again.');
        const expected = network === 'public'
          ? 'Public Global Stellar Network ; September 2015' : 'Test SDF Network ; September 2015';
        if (!prepared.xdr || prepared.networkPassphrase !== expected)
          throw new Error('Wrong network. Switch your wallet to the network shown in AudioBlocks and try again.');
        setStatus('awaiting-signature');
        let signed: string;
        try { signed = await signTransaction(prepared.xdr, { networkPassphrase: expected }); }
        catch (err) { throw new Error(getWalletSigningErrorMessage(err)); }
        if (currentIdentity.current !== identity) throw new Error('Wallet changed. Confirm your account before trying again.');
        setStatus('submitting'); submitStarted = true;
        const result = await submit(signed, attempt?.key);
        if (!result.txHash) throw new Error('Missing transaction hash.');
        if (scope && attempt) {
          localStorage.setItem(scope, JSON.stringify({ ...attempt, txHash: result.txHash }));
          if (currentIdentity.current === identity) { setTxHash(result.txHash); setStatus('pending'); }
        } else { setStatus('success'); callbacks.current.onSuccess?.(result); }
        callbacks.current.addTransaction(result.txHash, 'buy');
      } catch (err) {
        const message = submitStarted
          ? 'Submission may have reached the network. Checking server status; do not buy again.'
          : err instanceof Error ? err.message : 'Transaction failed. Please try again.';
        if (!submitStarted && scope && ownsScope) {
          try { localStorage.removeItem(scope); } catch { /* Storage remains fail-closed. */ }
        }
        if (currentIdentity.current === identity) {
          setError(message); setStatus(submitStarted && scope ? 'pending' : 'error');
          callbacks.current.onError?.(new Error(message));
        }
      } finally { if (scope && ownsScope) activeScopes.delete(scope); }
    };
    try {
      if (scope && navigator.locks) await navigator.locks.request(scope, execute);
      else await execute();
    } finally { busy.current = false; }
  }, [status, scope, publicKey, network, identity, prepare, submit, signTransaction]);
      setError(null);
      setStatus('preparing');

      // Step 1: Prepare transaction (backend assembles unsigned XDR)
      await checkChainSafety();
      const prepareResult = await prepare();
      const { xdr, networkPassphrase } = prepareResult;

      if (!xdr || !networkPassphrase) {
        throw new Error('Invalid prepare response: missing xdr or networkPassphrase');
      }

      // Verify network matches configured network
      const configuredNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
      const expectedPassphrase =
        configuredNetwork === 'public'
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

  return { run, status, txHash, error, reset };
}
