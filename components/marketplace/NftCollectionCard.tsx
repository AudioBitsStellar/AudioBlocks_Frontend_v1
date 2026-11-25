'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import BuyButton from '@/components/common/BuyButton';
import { ArtworkImage } from '@/components/ui/ArtworkImage';
import type { CollectionItem } from '@/lib/fixtures/marketplace';

export interface ExtendedCollectionItem extends CollectionItem {
  isAuction?: boolean;
  currentBid?: number;
  minimumBid?: number;
  auctionEndTime?: number;
}

export function formatTimeRemaining(endTime: number): string {
  const now = Date.now();
  const remaining = endTime - now;

  if (remaining <= 0) return 'Ended';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export interface NftCollectionCardProps {
  item: ExtendedCollectionItem;
  onBidClick?: (item: ExtendedCollectionItem) => void;
}

export function NftCollectionCard({ item, onBidClick }: NftCollectionCardProps) {
  const [timeLeft, setTimeLeft] = useState(
    item.auctionEndTime ? formatTimeRemaining(item.auctionEndTime) : null
  );

  useEffect(() => {
    if (!item.isAuction || !item.auctionEndTime) return;

    const interval = setInterval(() => {
      setTimeLeft(formatTimeRemaining(item.auctionEndTime!));
    }, 1000);

    return () => clearInterval(interval);
  }, [item.isAuction, item.auctionEndTime]);

  const isAuctionEnded = Boolean(item.auctionEndTime && Date.now() >= item.auctionEndTime);

  return (
    <div className="flex flex-col min-w-[280px] bg-surface border border-border-dark rounded-xl overflow-hidden transition-all duration-200 hover:bg-surface-hover hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]">
      <div className="relative aspect-square overflow-hidden">
        <ArtworkImage
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          src={item.image || '/placeholder.svg'}
          title={item.songName || item.eventName || item.itemName || 'Collection item'}
        />
        {item.isAuction && (
          <div className="absolute top-2 left-2 bg-brand/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
            <Clock className="text-white" size={12} />
            <span className="text-xs text-white font-semibold">Auction</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <div className="flex-1 space-y-0.5">
          <h3 className="font-semibold text-sm text-white truncate">{item.artistName}</h3>
          <p className="text-xs text-on-muted truncate">
            {item.songName || item.eventName || item.itemName}
          </p>
        </div>
        {item.isAuction ? (
          <div className="pt-2 border-t border-border-dark mt-auto space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-muted">Current bid:</span>
              <span className="font-semibold text-white">{item.currentBid} XLM</span>
            </div>
            {timeLeft && !isAuctionEnded && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-muted">Time left:</span>
                <span className="font-semibold text-brand">{timeLeft}</span>
              </div>
            )}
            <button
              className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                isAuctionEnded
                  ? 'bg-surface-input text-on-muted cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-hover text-white'
              }`}
              disabled={isAuctionEnded}
              type="button"
              onClick={() => onBidClick?.(item)}
            >
              {isAuctionEnded ? 'Auction Ended' : 'Place Bid'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-dark mt-auto">
            <BuyButton label="Buy Now" price={item.price} tokenId={item.id} />
            <span className="font-semibold text-xs text-on-muted shrink-0">{item.price}</span>
          </div>
        )}
      </div>
    </div>
  );
}
