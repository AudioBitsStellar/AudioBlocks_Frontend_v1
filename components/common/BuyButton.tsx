'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddress, abi } from '@/config/abi';

interface BuyButtonProps {
  tokenId: string;
  price: string;
  label: string;
}

const BuyButton = ({ tokenId, price, label }: BuyButtonProps) => {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const queryClient = useQueryClient();

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

  return (
    <button
      className="border-gray-600 border text-white px-4 py-2 rounded-2xl transition-colors text-sm mb-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      disabled={isProcessing}
      onClick={handleBuy}
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
  );
};

export default BuyButton;
