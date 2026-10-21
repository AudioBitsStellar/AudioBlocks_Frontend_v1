'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ExplorerLink } from '@/components/ExplorerLink';
import { NetworkFeeDisplay } from '@/components/NetworkFeeDisplay';
import { Modal } from '@/components/ui/Modal';
import { useSorobanRelay } from '@/hooks/useSorobanRelay';
import { extractFeeFromPrepareResponse } from '@/lib/sorobanFee';
import { getSorobanErrorMessage, extractErrorCode } from '@/lib/walletErrors';
import WalletHelpLink f from '@/components/ExplorerLink';
import { NetworkFeeDisplay } from '@/components/NetworkFeeDisplay';
import { Modal } from '@/components/ui/Modal';
import { useSorobanRelay } from '@/hooks/useSorobanRelay';
import { extractFeeFromPrepareResponse } from '@/lib/sorobanFee';
import { getSorobanErrorMessage, extractErrorCode } from '@/lib/walletErrors';
import { parseEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import WalletHelpLink from '@/components/help/WalletHelpLink';
import { Modal } from '@/components/ui/Modal';
import { contractAddress, abi } from '@/config/abi';
import { useStellarBalance } from '@/hooks/useStellarBalance';
>>>>>>> upstream/main

interface BuyButtonProps {
  tokenId: string;
  price: string;
  label: string;
  artistName?: string;
  songTitle?: string;
}

<<<<<<< HEAD
const BuyButton = ({ tokenId, price, label }: BuyButtonProps) => {
  const { publicKey, signTransaction } = useStellarWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuy = async () => {
    if (!publicKey) {
      toast.error('Please connect your Stellar wallet first');
      return;
    }

    try {
      setIsProcessing(true);
      // TODO: Integrate with backend to get unsigned XDR transaction
      // const response = await fetch('/api/transactions/buy', {
      //   method: 'POST',
      //   body: JSON.stringify({ tokenId, price }),
      // });
      // const { xdr } = await response.json();
      // const signedXdr = await signTransaction(xdr);
      // Submit signed transaction to backend
      
      toast.info('Stellar transaction integration pending - backend required');
    } catch (error: any) {
      toast.error(error?.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
=======
const BuyButton = ({ tokenId, price, label, artistName, songTitle }: BuyButtonProps) => {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: stellarBalance } = useStellarBalance();

  // Placeholder for wallet connection check
  // TODO: Integrate with actual Stellar wallet context when available
  const isWalletConnected = false;

  const { run, status, txHash, error, reset } = useSorobanRelay({
    prepare: async () => {
      // Call backend prepare endpoint
      const response = await fetch('/api/marketplace/buy/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          // buyerPublicKey would come from wallet context
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

      // Extract and store fee for display
      if (data.fee) {
        const feeInfo = extractFeeFromPrepareResponse(data);
        setNetworkFee(feeInfo.xlm);
      }

      return data;
    },
    submit: async (signedXdr: string) => {
      // Call backend submit endpoint
      const response = await fetch('/api/marketplace/buy/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      // Invalidate React Query caches
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
      setShowConfirm(false);
      setNetworkFee(null);
    },
  });

  const handleBuy = async () => {
    if (!isWalletConnected) {
      toast.error('Please connect your Stellar wallet to continue');
      return;
>>>>>>> upstream/main
    }

    await run();
  };

<<<<<<< HEAD
  return (
    <button 
      onClick={handleBuy}
      disabled={isProcessing || !publicKey}
      className="border-gray-600 border text-white px-4 py-2 rounded-2xl transition-colors text-sm mb-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing...
        </>
      ) : (
        label
      )}
    </button>
=======
  const handleConfirm = () => {
    setShowConfirm(false);
    handleBuy();
  };

  const isProcessing =
    status === 'preparing' || status === 'awaiting-signature' || status === 'submitting';
  const isOwned = txHash != null;

  // #555: Check if the user has enough Stellar XLM to cover the price.
  // Parse the price (e.g., "0.5 ETH" -> 0.5) and assume a small fee (~0.01 XLM).
  const priceXlm = parseFloat(price.split(' ')[0]);
  const estimatedFee = 0.01; // Stellar transaction fee estimate
  const totalRequired = priceXlm + estimatedFee;
  const hasInsufficientFunds =
    stellarBalance?.isFunded && stellarBalance.spendableXlm < totalRequired;

  return (
    <>
      <button
        className="border-gray-600 border text-white px-4 py-2 rounded-2xl transition-colors text-sm mb-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        disabled={isProcessing || isOwned}
        onClick={() => setShowConfirm(true)}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            {status === 'preparing' && 'Preparing...'}
            {status === 'awaiting-signature' && 'Awaiting signature...'}
            {status === 'submitting' && 'Submitting...'}
          </>
        ) : isOwned ? (
          'Owned'
        ) : (
          label
        )}
      </button>

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
            {process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'}.
          </p>

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800">
              {error}
            </p>
          )}

          <WalletHelpLink />
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-2xl text-sm text-on-muted hover:text-white transition-colors"
              onClick={() => {
                setShowConfirm(false);
                reset();
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-2xl text-sm bg-brand text-white hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={hasInsufficientFunds}
              onClick={handleBuy}
            >
              {!isWalletConnected ? 'Wallet not connected' : 'Confirm purchase'}
            </button>
          </div>
        </div>
      </Modal>
    </>
>>>>>>> upstream/main
  );
};

export default BuyButton;
