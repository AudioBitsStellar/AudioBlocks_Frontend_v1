'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { parseEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Modal } from '@/components/ui/Modal';
import { contractAddress, abi } from '@/config/abi';
import { useStellarBalance } from '@/hooks/useStellarBalance';

interface BuyButtonProps {
  tokenId: string;
  price: string;
  label: string;
}

const BuyButton = ({ tokenId, price, label }: BuyButtonProps) => {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const queryClient = useQueryClient();
  // Issue #319: confirm before submitting the transaction, so a stray click
  // never sends an on-chain purchase without the user seeing price/token first.
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: stellarBalance } = useStellarBalance();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // #142 — without this, a confirmed purchase never invalidates the NFT
  // collection reads (useNFTCollection's balanceOf/getArtistSongs/getSongById
  // calls), so the profile/collection pages keep showing stale ownership
  // data until a full page refresh. wagmi's contract-read hooks are backed
  // by the same TanStack Query cache these queryKey prefixes address, so
  // this invalidates them wherever they're mounted — including on a
  // completely different page than the one the purchase happened on.
  useEffect(() => {
    if (isSuccess) {
      toast.success('Purchase confirmed! Your collection has been updated.');
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
      queryClient.invalidateQueries({ queryKey: ['readContracts'] });
    }
  }, [isSuccess, queryClient]);

  const handleBuy = async () => {
    setShowConfirm(false);
    try {
      // Extract numeric ID from 'music-1', 'event-1', etc.
      const numericId = parseInt(tokenId.split('-')[1]);

      writeContract({
        address: contractAddress,
        abi: abi,
        functionName: 'purchase',
        args: [BigInt(numericId)],
        value: parseEther(price.split(' ')[0]),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error?.message || 'Transaction failed');
    }
  };

  // Helper to parse ETH
  // function parseEther(value: string) {
  //   return BigInt(parseFloat(value) * 10 ** 18);
  // }

  const isProcessing = isPending || isConfirming;

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
        disabled={isProcessing}
        onClick={() => setShowConfirm(true)}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            {isConfirming ? 'Confirming...' : 'Pending...'}
          </>
        ) : (
          label
        )}
      </button>

      <Modal
        description="This will submit an on-chain transaction and cannot be undone."
        open={showConfirm}
        size="sm"
        title="Confirm purchase"
        onClose={() => setShowConfirm(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-on-muted">
            You&apos;re about to buy <span className="text-white font-medium">{label}</span> for{' '}
            <span className="text-white font-medium">{price}</span>.
          </p>

          {/* #555: Warn when spendable balance is insufficient */}
          {hasInsufficientFunds && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="text-amber-400 mt-0.5 flex-shrink-0" size={16} />
              <div className="text-xs text-amber-200">
                <p className="font-semibold mb-1">Insufficient balance</p>
                <p>
                  You need at least {totalRequired.toFixed(2)} XLM (price + fee), but your
                  spendable balance is {stellarBalance.spendableXlm.toFixed(2)} XLM.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 rounded-2xl text-sm text-on-muted hover:text-white transition-colors"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-2xl text-sm bg-brand text-white hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={hasInsufficientFunds}
              onClick={handleBuy}
            >
              Confirm purchase
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BuyButton;
