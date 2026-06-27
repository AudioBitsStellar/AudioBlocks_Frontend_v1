'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddress, abi } from '@/config/abi';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { parseEther } from 'viem';

interface BuyButtonProps {
  tokenId: string;
  price: string;
  label: string;
}

const BuyButton = ({ tokenId, price, label }: BuyButtonProps) => {
  const { writeContract, data: hash, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleBuy = async () => {
    try {
      // Extract numeric ID from 'music-1', 'event-1', etc.
      const numericId = parseInt(tokenId.split('-')[1]);
      
      writeContract({
        address: contractAddress,
        abi: abi,
        functionName: 'purchase', 
        args: [numericId], 
        value: parseEther(price.split(' ')[0]),
      });

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
      onClick={handleBuy}
      disabled={isProcessing}
      className="border-gray-600 border text-white px-4 py-2 rounded-2xl transition-colors text-sm mb-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
