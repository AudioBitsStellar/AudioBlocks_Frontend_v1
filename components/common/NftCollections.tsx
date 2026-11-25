'use client';

import { useCallback, useMemo, useState } from 'react';
import { Inter } from 'next/font/google';
import { AuctionBidDialog } from '@/components/marketplace/AuctionBidDialog';
import {
  NftCollectionCard,
  type ExtendedCollectionItem,
} from '@/components/marketplace/NftCollectionCard';
import { NftCollectionFilters } from '@/components/marketplace/NftCollectionFilters';
import { Pagination } from '@/components/ui/pagination';
import { demoOr } from '@/lib/fixtures';
import { isFeatureEnabled } from '@/lib/featureFlags';
import {
  eventData as demoEvents,
  merchData as demoMerch,
  musicData as demoMusic,
  type CollectionItem,
} from '@/lib/fixtures/marketplace';

const inter = Inter({
  subsets: ['latin'],
  weight: '600',
  display: 'swap',
});

const ITEMS_PER_PAGE = 8;
const TABS = ['All', 'Latest', 'Tickets', 'Merches'];

const musicData = demoOr<CollectionItem[]>(demoMusic, []);
const eventData = demoOr<CollectionItem[]>(demoEvents, []);
const merchData = demoOr<CollectionItem[]>(demoMerch, []);
const marketplaceTradingEnabled = isFeatureEnabled('marketplaceTrading');

function parsePrice(price: string): number {
  return parseFloat(price.replace(' ETH', '').replace(' XLM', ''));
}

function matchesPrice(price: string, min: string, max: string): boolean {
  const value = parsePrice(price);
  if (min && value < parseFloat(min)) return false;
  if (max && value > parseFloat(max)) return false;
  return true;
}

function formatTimeRemaining(endTime: number): string {
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

interface CardProps {
  item: ExtendedCollectionItem;
  onBidClick?: (item: ExtendedCollectionItem) => void;
}

function Card({ item, onBidClick }: CardProps) {
  const [timeLeft, setTimeLeft] = useState(
    item.auctionEndTime ? formatTimeRemaining(item.auctionEndTime) : null
  );

  // Update countdown for auctions
  useEffect(() => {
    if (!item.isAuction || !item.auctionEndTime) return;

    const interval = setInterval(() => {
      setTimeLeft(formatTimeRemaining(item.auctionEndTime!));
    }, 1000);

    return () => clearInterval(interval);
  }, [item.isAuction, item.auctionEndTime]);

  const isAuctionEnded = item.auctionEndTime && Date.now() >= item.auctionEndTime;
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
            <Clock size={12} className="text-white" />
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
                isAuctionEnded || !marketplaceTradingEnabled
                  ? 'bg-surface-input text-on-muted cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-hover text-white'
              }`}
              disabled={isAuctionEnded || !marketplaceTradingEnabled}
              title={!marketplaceTradingEnabled ? 'Bidding is not available yet' : undefined}
              onClick={() => onBidClick?.(item)}
            >
              {!marketplaceTradingEnabled ? 'Coming Soon' : isAuctionEnded ? 'Auction Ended' : 'Place Bid'}
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

export default function NftCollection() {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAuction, setSelectedAuction] = useState<ExtendedCollectionItem | null>(null);

  const allItems = useMemo<CollectionItem[]>(() => [...musicData, ...eventData, ...merchData], []);

  const getTabData = useCallback(() => {
    switch (activeTab) {
      case 'Latest':
        return musicData;
      case 'Tickets':
        return eventData;
      case 'Merches':
        return merchData;
      default:
        return allItems;
    }
  }, [activeTab, allItems]);

  const filtered = useMemo(() => {
    const tabData = getTabData();
    return tabData.filter((item: CollectionItem) => {
      const searchable =
        `${item.artistName || ''} ${item.songName || item.eventName || item.itemName || ''}`.toLowerCase();
      const matchesSearch = !search || searchable.includes(search.toLowerCase());
      const inPriceRange = matchesPrice(item.price, priceMin, priceMax);
      return matchesSearch && inPriceRange;
    });
  }, [getTabData, search, priceMin, priceMax]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen max-w-11/12 mx-auto bg-black px-4 sm:px-8 py-8 sm:py-12 overflow-x-hidden">
      <NftCollectionFilters
        activeTab={activeTab}
        fontClass={inter.className}
        priceMax={priceMax}
        priceMin={priceMin}
        search={search}
        tabs={TABS}
        onPriceMaxChange={(val) => {
          setPriceMax(val);
          setCurrentPage(1);
        }}
        onPriceMinChange={(val) => {
          setPriceMin(val);
          setCurrentPage(1);
        }}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentPage(1);
        }}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-on-muted">
          <p className="text-lg">No items match your filters.</p>
          <button
            className="mt-4 px-4 py-2 text-sm text-white bg-brand rounded-full hover:bg-brand-hover"
            type="button"
            onClick={() => {
              setSearch('');
              setPriceMin('');
              setPriceMax('');
              setCurrentPage(1);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div
            className="grid gap-4 sm:gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {paginatedItems.map((item) => (
              <NftCollectionCard key={item.id} item={item} onBidClick={setSelectedAuction} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 pb-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {selectedAuction?.isAuction && (
        <AuctionBidDialog
          auctionId={selectedAuction.id}
          currentBid={selectedAuction.currentBid || 0}
          endTime={selectedAuction.auctionEndTime || Date.now()}
          itemTitle={
            selectedAuction.songName ||
            selectedAuction.eventName ||
            selectedAuction.itemName ||
            'Auction Item'
          }
          minimumBid={selectedAuction.minimumBid || 0}
          onClose={() => setSelectedAuction(null)}
          onSuccess={() => {
            setSelectedAuction(null);
          }}
        />
      )}
    </div>
  );
}
