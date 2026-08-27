'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { abi, contractAddress } from '@/config/abi';

interface NftApprovalProps {
  songId: bigint;
  onSuccess?: () => void;
}

export function NftApproval({ songId, onSuccess }: NftApprovalProps) {
  const [operator, setOperator] = useState('');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const handleApprove = () => {
    if (!operator.startsWith('0x') || operator.length !== 42) {
      toast.error('Invalid address');
      return;
    }

    if (mode === 'single') {
      writeContract(
        {
          address: contractAddress,
          abi,
          functionName: 'approve',
          args: [operator as `0x${string}`, songId],
        },
        {
          onSuccess: () => {
            toast.success('Approval submitted');
            setOperator('');
            onSuccess?.();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      writeContract(
        {
          address: contractAddress,
          abi,
          functionName: 'setApprovalForAll',
          args: [operator as `0x${string}`, true],
        },
        {
          onSuccess: () => {
            toast.success('Bulk approval submitted');
            setOperator('');
            onSuccess?.();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === 'single' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          onClick={() => setMode('single')}
        >
          Single NFT
        </button>
        <button
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === 'bulk' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
          onClick={() => setMode('bulk')}
        >
          All NFTs
        </button>
      </div>
      <input
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        placeholder="Operator address (0x...)"
        type="text"
        value={operator}
        onChange={(e) => setOperator(e.target.value)}
      />
      <button
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        disabled={isPending || isConfirming || !operator}
        onClick={handleApprove}
      >
        {isPending
          ? 'Confirming...'
          : isConfirming
            ? 'Processing...'
            : mode === 'single'
              ? 'Approve NFT'
              : 'Approve All'}
      </button>
    </div>
  );
}
