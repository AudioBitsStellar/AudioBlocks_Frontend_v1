'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { X, Clock, Gavel } from 'lucide-react';
import { useSorobanRelay } from '@/hooks/useSorobanRelay';

interface AuctionBidDialogProps {
  auctionId: string;
  itemTitle: string;
  currentBid: number;
  minimumBid: number;
  endTime: number; // Unix timestamp
  onSuccess: () => void;
  onClose: () => void;
  refetchInterval?: number;
}

const MAX_DECIMAL_PLACES = 7;

function formatTimeRemaining(endTime: number): string {
  const now = Date.now();
  const remaining = endTime - now;

  if (remaining <= 0) return 'Ended';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function AuctionBidDialog({
  auctionId,
  itemTitle,
  currentBid,
  minimumBid,
  endTime,
  onSuccess,
  onClose,
  refetchInterval = 5000,
}: AuctionBidDialogProps) {
  const [bidAmount, setBidAmount] = useState(minimumBid.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(endTime));
  const [hasEnded, setHasEnded] = useState(Date.now() >= endTime);
  const { relay, isPending } = useSorobanRelay();

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = formatTimeRemaining(endTime);
      setTimeRemaining(remaining);
      setHasEnded(Date.now() >= endTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  // Refresh auction state while active
  useEffect(() => {
    if (hasEnded) return;

    const interval = setInterval(() => {
      // TODO: Fetch latest auction state from backend/blockchain
      // This should update currentBid and minimumBid
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [hasEnded, refetchInterval]);

  const validateBid = (value: string): boolean => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < minimumBid) return false;
    const parts = value.split('.');
    if (parts[1] && parts[1].length > MAX_DECIMAL_PLACES) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validateBid(bidAmount)) {
      toast.error(`Bid must be at least ${minimumBid} XLM`);
      return;
    }

    if (hasEnded) {
      toast.error('This auction has ended');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Prepare the bid transaction
      const prepareResponse = await relay({
        operation: 'prepare-bid',
        params: {
          auctionId,
          bidAmount: parseFloat(bidAmount),
        },
      });

      if (!prepareResponse || !prepareResponse.xdr) {
        throw new Error('Failed to prepare bid transaction');
      }

      // Step 2: Sign the transaction with the wallet
      // TODO: Integrate with Stellar wallet (Freighter/Albedo) for signing
      const signedXdr = prepareResponse.xdr;

      // Step 3: Submit the signed bid
      const submitResponse = await relay({
        operation: 'submit-bid',
        params: {
          signedXdr,
        },
      });

      if (submitResponse && submitResponse.txHash) {
        toast.success(`Bid of ${bidAmount} XLM placed successfully`);
        onSuccess();
      } else {
        throw new Error('Failed to submit bid');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place bid';
      
      // Handle outbid race condition
      if (message.includes('bid too low') || message.includes('outbid')) {
        toast.error('Someone placed a higher bid. Please refresh and try again.');
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border-dark rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Place a Bid</h2>
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
            <p className="text-sm text-on-muted mb-2">Item</p>
            <p className="text-white font-medium truncate">{itemTitle}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-on-muted mb-1">Current Bid</p>
              <p className="text-white font-semibold">{currentBid} XLM</p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-on-muted mb-1 flex items-center gap-1">
                <Clock size={14} />
                Time Left
              </p>
              <p className={`font-semibold ${hasEnded ? 'text-red-400' : 'text-white'}`}>
                {timeRemaining}
              </p>
            </div>
          </div>

          {hasEnded ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <Gavel className="mx-auto mb-2 text-red-400" size={24} />
              <p className="text-red-400 font-medium">Auction has ended</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-on-muted mb-2" htmlFor="bidAmount">
                  Your Bid (XLM)
                </label>
                <input
                  className="w-full px-4 py-2 bg-surface-input border border-border-dark rounded-lg text-white placeholder-on-muted focus:outline-none focus:ring-2 focus:ring-brand"
                  id="bidAmount"
                  min={minimumBid}
                  placeholder={minimumBid.toString()}
                  step="0.0000001"
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
                <p className="text-xs text-on-muted mt-1">
                  Minimum bid: {minimumBid} XLM (max {MAX_DECIMAL_PLACES} decimals)
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
                  disabled={!validateBid(bidAmount) || isSubmitting || isPending || hasEnded}
                  onClick={handleSubmit}
                  type="button"
                >
                  {isSubmitting || isPending ? 'Placing Bid...' : 'Place Bid'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
