'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { abi, contractAddress } from '@/config/abi';

interface NftTransferProps {
  songId: bigint;
  onSuccess?: () => void;
}

export function NftTransfer({ songId, onSuccess }: NftTransferProps) {
  const [toAddress, setToAddress] = useState('');
  const { address: fromAddress } = useAccount();

  const { writeContract, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const handleTransfer = () => {
    if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
      toast.error('Invalid address');
      return;
    }
    if (!fromAddress) {
      toast.error('Wallet not connected');
      return;
    }

    writeContract(
      {
        address: contractAddress,
        abi,
        functionName: 'transferFrom',
        args: [fromAddress, toAddress as `0x${string}`, songId],
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
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Recipient address (0x...)"
        type="text"
        value={toAddress}
        onChange={(e) => setToAddress(e.target.value)}
      />
      <button
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        disabled={isPending || isConfirming || !toAddress}
        onClick={handleTransfer}
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Transfer NFT'}
      </button>
    </div>
  );
}
