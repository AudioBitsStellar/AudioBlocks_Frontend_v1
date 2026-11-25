'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
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
  const { run, status, error, reset } = useSorobanRelay({
    prepare: async () => {
      const response = await fetch('/api/marketplace/listing/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: songId.toString(),
          price: parseFloat(price),
          asset: 'XLM', // Start with XLM
        }),
      });
      if (!response.ok) throw new Error('Failed to prepare listing transaction');
      return response.json();
    },
    submit: async (signedXdr: string) => {
      const response = await fetch('/api/marketplace/listing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr }),
      });
      if (!response.ok) throw new Error('Failed to submit listing');
      return response.json();
    },
    onSuccess: () => {
      toast.success(`Successfully listed "${songTitle}" for ${price} XLM`);
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const isSubmitting = status === 'preparing' || status === 'awaiting-signature' || status === 'submitting';

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

    await run();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal open size="sm" title="List NFT for Sale" onClose={handleClose}>
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
          <p className="text-xs text-on-muted mt-1">Maximum {MAX_DECIMAL_PLACES} decimal places</p>
        </div>

        <div className="bg-surface-hover border border-border-dark rounded-lg p-3">
          <p className="text-xs text-on-muted">
            Note: Listing fees and royalty information will be displayed here once available from
            the backend.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-800" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            className="flex-1 px-4 py-2 bg-surface-input border border-border-dark rounded-lg text-white hover:bg-surface-hover transition-colors disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2 bg-brand hover:bg-brand-hover rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!validatePrice(price) || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? 'Listing...' : 'List for Sale'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
