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

function parsePrice(price: string): number {
  return parseFloat(price.replace(' ETH', '').replace(' XLM', ''));
}

function matchesPrice(price: string, min: string, max: string): boolean {
  const value = parsePrice(price);
  if (min && value < parseFloat(min)) return false;
  if (max && value > parseFloat(max)) return false;
  return true;
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
