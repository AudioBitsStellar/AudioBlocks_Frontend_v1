'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { useSorobanRelay } from '@/hooks/useSorobanRelay';

interface NftTransferProps {
  songId: bigint;
  onSuccess?: () => void;
}

function validateStrKey(address: string): boolean {
  if (!address.startsWith('G') || address.length !== 56) return false;
  const validChars = /^[A-Za-z0-9]+$/;
  return validChars.test(address);
}

export function NftTransfer({ songId, onSuccess }: NftTransferProps) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSelfTransfer, setIsSelfTransfer] = useState(false);
  const { relay, isPending } = useSorobanRelay();

  const isValidAddress = validateStrKey(recipientAddress);
  const isSelf = recipientAddress === (typeof window !== 'undefined' ? localStorage.getItem('userStellarAddress') : '');

  const handlePrepareTransfer = () => {
    if (!isValidAddress) {
      toast.error('Invalid Stellar address. Must start with G and be 56 characters.');
      return;
    }

    if (isSelf) {
      setIsSelfTransfer(true);
    }

    setShowConfirmation(true);
  };

  const handleConfirmTransfer = async () => {
    if (!isValidAddress) return;

    try {
      await relay({
        operation: 'transfer_nft',
        params: {
          songId: songId.toString(),
          recipientAddress,
        },
      });

      toast.success('NFT transferred successfully! This action is irreversible.');
      setRecipientAddress('');
      setShowConfirmation(false);
      setIsSelfTransfer(false);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transfer failed';
      toast.error(message);
    }
  };

  if (showConfirmation) {
    return (
      <div className="space-y-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white mb-2">Confirm Transfer</h3>
            <p className="text-sm text-gray-300 mb-3">
              You are about to transfer Song #{songId.toString()} to {recipientAddress}
            </p>
            {isSelfTransfer && (
              <p className="text-xs text-yellow-400 mb-3">
                ⚠️ Warning: You are transferring to your own account. This action is irreversible.
              </p>
            )}
            <p className="text-xs text-red-400 font-semibold mb-4">
              ⚠️ This action is permanent and cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
            disabled={isPending}
            onClick={() => setShowConfirmation(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            disabled={isPending}
            onClick={handleConfirmTransfer}
            type="button"
          >
            {isPending ? 'Processing...' : 'Confirm Transfer'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        className="w-full rounded-lg border border-gray-700 bg-background px-3 py-2 text-sm text-white placeholder:text-gray-500"
        disabled={isPending}
        placeholder="Recipient address (G...)"
        type="text"
        value={recipientAddress}
        onChange={(e) => setRecipientAddress(e.target.value)}
      />
      {recipientAddress && !isValidAddress && (
        <p className="text-xs text-red-400">Invalid address format. Must be a Stellar address starting with G.</p>
      )}
      <button
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        disabled={isPending || !isValidAddress}
        onClick={handlePrepareTransfer}
        type="button"
      >
        {isPending ? 'Processing...' : 'Transfer NFT'}
      </button>
    </div>
  );
}
