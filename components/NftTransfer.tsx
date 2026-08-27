'use client';
import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import { abi, contractAddress } from '@/config/abi';

interface NftTransferProps {
  songId: bigint;
  onSuccess?: () => void;
}

export function NftTransfer({ songId, onSuccess }: NftTransferProps) {
  const [toAddress, setToAddress] = useState('');

  const { writeContract, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const handleTransfer = () => {
    if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
      toast.error('Invalid address');
      return;
    }

    writeContract(
      {
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'transferFrom',
        args: [toAddress, toAddress, songId],
      },
      {
        onSuccess: () => {
          toast.success('Transfer submitted');
          setToAddress('');
          onSuccess?.();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Recipient address (0x...)"
        value={toAddress}
        onChange={(e) => setToAddress(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
      />
      <button
        onClick={handleTransfer}
        disabled={isPending || isConfirming || !toAddress}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Transfer NFT'}
      </button>
    </div>
  );
}
