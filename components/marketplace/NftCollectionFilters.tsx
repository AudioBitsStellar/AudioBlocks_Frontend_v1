'use client';

import { Search } from 'lucide-react';

interface NftCollectionFiltersProps {
  fontClass: string;
  search: string;
  onSearchChange: (value: string) => void;
  activeTab: string;
  tabs: string[];
  onTabChange: (tab: string) => void;
  priceMin: string;
  onPriceMinChange: (value: string) => void;
  priceMax: string;
  onPriceMaxChange: (value: string) => void;
}

export function NftCollectionFilters({
  fontClass,
  search,
  onSearchChange,
  activeTab,
  tabs,
  onTabChange,
  priceMin,
  onPriceMinChange,
  priceMax,
  onPriceMaxChange,
}: NftCollectionFiltersProps) {
  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12">
        <h1
          className={`${fontClass} capitalize text-3xl sm:text-4xl md:text-[48px] font-semibold leading-tight tracking-normal`}
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
            onChange={(e) => onSearchChange(e.target.value)}
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
              type="button"
              onClick={() => onTabChange(tab)}
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
            onChange={(e) => onPriceMinChange(e.target.value)}
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
            onChange={(e) => onPriceMaxChange(e.target.value)}
          />
          <span className="text-xs text-on-muted">ETH</span>
        </div>
      </div>
    </>
  );
}
