'use client';
import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
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
          address: contractAddress as `0x${string}`,
          abi,
          functionName: 'approve',
          args: [operator, songId],
        },
        {
          onSuccess: () => { toast.success('Approval submitted'); setOperator(''); onSuccess?.(); },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      writeContract(
        {
          address: contractAddress as `0x${string}`,
          abi,
          functionName: 'setApprovalForAll',
          args: [operator, true],
        },
        {
          onSuccess: () => { toast.success('Bulk approval submitted'); setOperator(''); onSuccess?.(); },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('single')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === 'single' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          Single NFT
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === 'bulk' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          All NFTs
        </button>
      </div>
      <input
        type="text"
        placeholder="Operator address (0x...)"
        value={operator}
        onChange={(e) => setOperator(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
      />
      <button
        onClick={handleApprove}
        disabled={isPending || isConfirming || !operator}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : mode === 'single' ? 'Approve NFT' : 'Approve All'}
      </button>
    </div>
  );
}
