'use client';

import { useState } from 'react';
import { getApiUrl } from '@/lib/apiUrl';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExplorerLink } from '@/components/ExplorerLink';
import WalletHelpLink from '@/components/help/WalletHelpLink';
import { NetworkFeeDisplay } from '@/components/NetworkFeeDisplay';
import { Modal } from '@/components/ui/Modal';
import { useStellarWallet } from '@/context/StellarWalletContext';
import { useSorobanRelay } from '@/hooks/useSorobanRelay';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { extractFeeFromPrepareResponse } from '@/lib/sorobanFee';
import { getSorobanErrorMessage, extractErrorCode } from '@/lib/walletErrors';

interface BuyButtonProps {
  tokenId: string;
  price: string;
  label: string;
  artistName?: string;
  songTitle?: string;
}

const BuyButton = ({ tokenId, price, label, artistName, songTitle }: BuyButtonProps) => {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [networkFee, setNetworkFee] = useState<number | null>(null);
  const { data: stellarBalance, isLoading: balanceLoading, isError: balanceError, refetch: refreshBalance } = useStellarBalance();
  const { publicKey } = useStellarWallet();

  const isWalletConnected = !!publicKey;
  const tradingEnabled = isFeatureEnabled('marketplaceTrading');

  const { run, status, txHash, error, reset } = useSorobanRelay({
    purchaseTokenId: tokenId,
    prepare: async (idempotencyKey) => {
      const response = await fetch(getApiUrl('marketplace/prepare-buy'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
        body: JSON.stringify({
          tokenId,
          buyerPublicKey: publicKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = extractErrorCode(errorData);
        throw new Error(
          errorCode ? getSorobanErrorMessage(errorCode) : 'Failed to prepare transaction'
        );
      }

      const data = await response.json();

      if (data.fee) {
        const feeInfo = extractFeeFromPrepareResponse(data);
        setNetworkFee(feeInfo.xlm);
      }

      return data;
    },
    submit: async (signedXdr: string, idempotencyKey) => {
      const response = await fetch(getApiUrl('marketplace/submit-buy'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
        body: JSON.stringify({ signedXdr }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = extractErrorCode(errorData);
        throw new Error(
          errorCode ? getSorobanErrorMessage(errorCode) : 'Failed to submit transaction'
        );
      }

      return await response.json();
    },
    onSuccess: (result) => {
      toast.success(
        <div className="flex flex-col gap-1">
          <span>Purchase successful!</span>
          {result.txHash && (
            <ExplorerLink className="text-xs" type="tx" value={result.txHash}>
              View transaction
            </ExplorerLink>
          )}
        </div>
      );

      trackEvent('purchase', {
        tokenId,
        price,
        network: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
      });

      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['nft'] });
      queryClient.invalidateQueries({ queryKey: ['collection'] });

      setShowConfirm(false);
      setNetworkFee(null);
    },
    onError: (err) => {
      const errorCode = extractErrorCode(err);
      const message = errorCode ? getSorobanErrorMessage(errorCode) : err.message;

      toast.error(message);
      setNetworkFee(null);
    },
  });

  const handleBuy = async () => {
    if (!isWalletConnected) {
      toast.error('Please connect your Stellar wallet to continue');
      return;
    }

    if (isProcessing || isOwned || balanceLoading || balanceError || !stellarBalance || hasInsufficientFunds) return;
    await run();
  };


  const isProcessing =
    status === 'preparing' || status === 'awaiting-signature' || status === 'submitting' || status === 'pending';
  const isOwned = status === 'success';

  const priceXlm = /^\d+(?:\.\d+)?(?:\s+XLM)?$/i.test(price.trim()) ? Number(price.trim().split(/\s+/)[0]) : null;
  const estimatedFee = 0.01;
  const totalRequired = (priceXlm ?? 0) + (networkFee ?? estimatedFee);
  const hasInsufficientFunds =
    !!stellarBalance && (!stellarBalance.isFunded || stellarBalance.spendableXlm < totalRequired);

  if (!tradingEnabled) {
    return (
      <button
        className="border-gray-600 border text-white px-4 py-2 rounded-2xl text-sm mb-2 opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
        disabled
        title="Buying is not available yet"
      >
        Coming soon
      </button>
    );
  }

  return (
    <>
      <button
        className="border-gray-600 border text-white px-4 py-2 rounded-2xl transition-colors text-sm mb-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        disabled={isProcessing || isOwned || !isWalletConnected}
        onClick={() => setShowConfirm(true)}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            {status === 'preparing' && 'Preparing...'}
            {status === 'awaiting-signature' && 'Awaiting signature...'}
            {status === 'submitting' && 'Submitting...'}
            {status === 'pending' && 'Purchase pending...'}
          </>
        ) : isOwned ? (
          'Owned'
        ) : (
          label
        )}
      </button>
      {status === 'pending' && (
        <p role="status" className="text-xs text-amber-300 mb-2">
          {error || 'Checking purchase status with the server. Do not buy again.'}
          {txHash && <ExplorerLink type="tx" value={txHash}> View transaction</ExplorerLink>}
        </p>
      )}

      <Modal
        description="This will submit a Soroban transaction on the Stellar network."
        open={showConfirm}
        size="sm"
        title="Confirm purchase"
        onClose={() => {
          setShowConfirm(false);
          reset();
        }}
      >
        <div className="space-y-4">
          <div className="space-y-2 text-sm text-on-muted">
            {songTitle && (
              <p>
                <span className="text-gray-400">Song:</span>{' '}
                <span className="text-white font-medium">{songTitle}</span>
              </p>
            )}
            {artistName && (
              <p>
                <span className="text-gray-400">Artist:</span>{' '}
                <span className="text-white font-medium">{artistName}</span>
              </p>
            )}
            <p>
              <span className="text-gray-400">Price:</span>{' '}
              <span className="text-white font-medium">{price}</span>
            </p>
            {networkFee && (
              <div className="pt-2 border-t border-gray-700">
                <NetworkFeeDisplay className="text-sm" feeXLM={networkFee} />
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded-lg">
            You are buying an NFT on the Stellar{' '}
            {['mainnet', 'public'].includes(process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? '') ? 'mainnet' : 'testnet'}. This
            transaction is final once confirmed on-chain and cannot be refunded. See our{' '}
            <Link className="underline hover:text-white" href="/legal/terms">
              Terms of Service
            </Link>
            .
          </p>

          {error && (
            <p
              className="text-xs text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800"
              role="alert"
            >
              {error}
            </p>
          )}

          <WalletHelpLink />
          {balanceLoading && <p role="status">Checking your spendable balance...</p>}
          {balanceError && <p role="alert">Unable to check your balance. Refresh before confirming.</p>}
          {hasInsufficientFunds && (
            <p role="alert" className="text-sm text-amber-300">
              {!stellarBalance?.isFunded ? 'This account is not funded. Add XLM to activate it.' :
                `Insufficient spendable balance. You have ${stellarBalance.spendableXlm.toFixed(7)} XLM available after reserves. Add funds for ${priceXlm === null ? 'network fees' : 'the price and network fees'}, then refresh.`}
              {' '}Keep XLM available for reserves. Wallet help explains funding and trustlines.
            </p>
          )}
          <button type="button" className="text-sm underline" onClick={() => void refreshBalance()}>
            Refresh balance
          </button>
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-2xl text-sm text-on-muted hover:text-white transition-colors"
              disabled={isProcessing}
              onClick={() => {
                setShowConfirm(false);
                reset();
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-2xl text-sm bg-brand text-white hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing || isOwned || balanceLoading || balanceError || !stellarBalance || hasInsufficientFunds || !isWalletConnected}
              onClick={handleBuy}
            >
              {!isWalletConnected ? 'Wallet not connected' : 'Confirm purchase'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BuyButton;

