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
  const [networkFee, setNetworkFee] = useState<string | null>(null);

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
    }

    await run();
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    handleBuy();
  };

  const isProcessing =
    status === 'preparing' || status === 'awaiting-signature' || status === 'submitting';
  const isOwned = txHash != null;

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
              className="px-4 py-2 rounded-2xl text-sm bg-brand text-white hover:bg-pink-700 transition-colors disabled:opacity-50"
              disabled={!isWalletConnected}
              onClick={handleConfirm}
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
