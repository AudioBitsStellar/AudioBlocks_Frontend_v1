'use client';

import { useState, useMemo, useCallback } from 'react';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import { Search } from 'lucide-react';
import BuyButton from './BuyButton';

interface CollectionItem {
  id: string;
  image: string;
  artistName: string;
  songName?: string;
  eventName?: string;
  itemName?: string;
  price: string;
}

const inter = Inter({
  subsets: ['latin'],
  weight: '600',
  display: 'swap',
});

const musicData = [
  {
    id: 'music-1',
    image: '/wif.jpg',
    artistName: 'Wiffi Drips',
    songName: 'Bigger',
    price: '0.5 ETH',
  },
  {
    id: 'music-2',
    image: '/chilli.jpg',
    artistName: 'Mchivir',
    songName: 'ASILW',
    price: '0.3 ETH',
  },
  {
    id: 'music-3',
    image: '/cat.png',
    artistName: 'Soldier Cat',
    songName: 'Bad Guy',
    price: '0.7 ETH',
  },
  {
    id: 'music-4',
    image: '/moon.webp',
    artistName: 'Lost',
    songName: 'Circles',
    price: '0.4 ETH',
  },
];

const eventData = [
  {
    id: 'event-1',
    image: '/AFRO.jpg',
    artistName: 'Wiffi Drips Tour',
    eventName: 'World Tour',
    price: '1.2 ETH',
  },
  {
    id: 'event-2',
    image: '/tech.jpg',
    artistName: 'Ara',
    eventName: 'Sweetener World Tour',
    price: '0.9 ETH',
  },
  {
    id: 'event-3',
    image: '/rap.png',
    artistName: 'Rap Battle',
    eventName: 'Mat Tour',
    price: '0.8 ETH',
  },
];

const merchData = [
  {
    id: 'merch-1',
    image: '/audio.jpg',
    artistName: 'AudioBlocks',
    itemName: 'T-Shirts',
    price: '0.2 ETH',
  },
  {
    id: 'merch-2',
    image: '/ad.jpg',
    artistName: 'AudioBlocks',
    itemName: 'Folklore Vinyl',
    price: '0.15 ETH',
  },
  {
    id: 'merch-3',
    image: '/ads.jpg',
    artistName: 'BTS',
    itemName: 'Official T-Shirt',
    price: '0.1 ETH',
  },
];

function parsePrice(price: string): number {
  return parseFloat(price.replace(' ETH', ''));
}

function matchesPrice(price: string, min: string, max: string): boolean {
  const value = parsePrice(price);
  if (min && value < parseFloat(min)) return false;
  if (max && value > parseFloat(max)) return false;
  return true;
}

function Card({ item }: { item: CollectionItem }) {
  return (
    <div className="flex flex-col bg-surface border border-border-dark rounded-xl overflow-hidden transition-all duration-200 hover:bg-surface-hover hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]">
      <div className="relative aspect-square overflow-hidden">
        <Image
          fill
          alt={item.songName || item.eventName || item.itemName || 'Collection item'}
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          src={item.image || '/placeholder.svg'}
        />
      </div>
      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <div className="flex-1 space-y-0.5">
          <h3 className="font-semibold text-sm text-white truncate">{item.artistName}</h3>
          <p className="text-xs text-on-muted truncate">
            {item.songName || item.eventName || item.itemName}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-dark mt-auto">
          <BuyButton label="Buy Now" price={item.price} tokenId={item.id} />
          <span className="font-semibold text-xs text-on-muted shrink-0">{item.price}</span>
        </div>
      </div>
    </div>
  );
}

export default function NftCollection() {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const tabs = ['All', 'Latest', 'Tickets', 'Merches'];

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

  return (
    <div className="min-h-screen max-w-11/12 mx-auto bg-black px-4 sm:px-8 py-8 sm:py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12">
        <h1
          className={`${inter.className} capitalize text-3xl sm:text-4xl md:text-[48px] font-semibold leading-tight tracking-normal`}
        >
          Trending <span className="text-gray-400">NFT</span> Collections
        </h1>

        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            aria-label="Search NFT collections"
            className="w-full sm:w-80 h-11 pl-10 pr-5 py-2 rounded-full bg-surface-input border border-border-dark text-white placeholder-on-muted focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Search by artist or title..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-7">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`relative text-sm font-medium px-4 py-2 rounded-full transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-brand text-white'
                  : 'bg-surface text-on-muted hover:bg-surface-hover hover:text-white'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-on-muted">Price:</label>
          <input
            aria-label="Minimum price in ETH"
            className="w-20 h-9 px-3 py-1 rounded-full bg-surface-input border border-border-dark text-white text-sm placeholder-on-muted focus:outline-none focus:ring-2 focus:ring-brand"
            min="0"
            placeholder="Min"
            step="0.1"
            type="number"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <span className="text-on-muted">-</span>
          <input
            aria-label="Maximum price in ETH"
            className="w-20 h-9 px-3 py-1 rounded-full bg-surface-input border border-border-dark text-white text-sm placeholder-on-muted focus:outline-none focus:ring-2 focus:ring-brand"
            min="0"
            placeholder="Max"
            step="0.1"
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
          <span className="text-xs text-on-muted">ETH</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-on-muted">
          <p className="text-lg">No items match your filters.</p>
          <button
            className="mt-4 px-4 py-2 text-sm text-white bg-brand rounded-full hover:bg-brand-hover"
            onClick={() => {
              setSearch('');
              setPriceMin('');
              setPriceMax('');
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filtered.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
