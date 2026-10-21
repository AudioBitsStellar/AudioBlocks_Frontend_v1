'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { useSorobanRelay } from '@/hooks/useSorobanRelay';

interface ListNFTDialogProps {
  songId: bigint;
  songTitle: string;
  onSuccess: () => void;
  onClose: () => void;
}

const MAX_DECIMAL_PLACES = 7;

export function ListNFTDialog({ songId, songTitle, onSuccess, onClose }: ListNFTDialogProps) {
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { relay, isPending } = useSorobanRelay();

  const validatePrice = (value: string): boolean => {
    if (!value || parseFloat(value) <= 0) return false;
    const parts = value.split('.');
    if (parts[1] && parts[1].length > MAX_DECIMAL_PLACES) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validatePrice(price)) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Prepare the listing transaction
      const prepareResponse = await relay({
        operation: 'prepare-listing',
        params: {
          tokenId: songId.toString(),
          price: parseFloat(price),
          asset: 'XLM', // Start with XLM
        },
      });

      if (!prepareResponse || !prepareResponse.xdr) {
        throw new Error('Failed to prepare listing transaction');
      }

      // Step 2: Sign the transaction with the wallet
      // TODO: Integrate with Stellar wallet (Freighter/Albedo) for signing
      // For now, this is a placeholder that needs actual wallet signing
      const signedXdr = prepareResponse.xdr; // This needs to be signed by the wallet

      // Step 3: Submit the signed transaction
      const submitResponse = await relay({
        operation: 'submit-listing',
        params: {
          signedXdr,
        },
      });

      if (submitResponse && submitResponse.txHash) {
        toast.success(`Successfully listed "${songTitle}" for ${price} XLM`);
        onSuccess();
        onClose();
      } else {
        throw new Error('Failed to submit listing');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list NFT';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border-dark rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">List NFT for Sale</h2>
          <button
            className="p-1 hover:bg-surface-hover rounded-full transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="text-on-muted" size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-on-muted mb-2">Song</p>
            <p className="text-white font-medium truncate">{songTitle}</p>
          </div>

          <div>
            <label className="block text-sm text-on-muted mb-2" htmlFor="price">
              Price (XLM)
            </label>
            <input
              className="w-full px-4 py-2 bg-surface-input border border-border-dark rounded-lg text-white placeholder-on-muted focus:outline-none focus:ring-2 focus:ring-brand"
              id="price"
              max="9999999"
              min="0"
              placeholder="0.00"
              step="0.0000001"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-xs text-on-muted mt-1">
              Maximum {MAX_DECIMAL_PLACES} decimal places
            </p>
          </div>

          <div className="bg-surface-hover border border-border-dark rounded-lg p-3">
            <p className="text-xs text-on-muted">
              Note: Listing fees and royalty information will be displayed here once available from
              the backend.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 px-4 py-2 bg-surface-input border border-border-dark rounded-lg text-white hover:bg-surface-hover transition-colors disabled:opacity-50"
              disabled={isSubmitting || isPending}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="flex-1 px-4 py-2 bg-brand hover:bg-brand-hover rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!validatePrice(price) || isSubmitting || isPending}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting || isPending ? 'Listing...' : 'List for Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
