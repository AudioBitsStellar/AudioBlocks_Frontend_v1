import React from 'react';
import Link from 'next/link';
import { Disc3, Music2, Sparkles } from 'lucide-react';

interface CollectionEmptyStateProps {
  className?: string;
}

export const CollectionEmptyState: React.FC<CollectionEmptyStateProps> = ({ className = '' }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-20 px-4 text-center text-on-muted min-h-[360px] ${className}`}
      data-testid="collection-empty-state"
    >
      <div className="relative mb-6 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-brand/20 via-surface to-brand/10 border border-brand/30 flex items-center justify-center shadow-lg shadow-brand/10">
          <Disc3 aria-hidden="true" className="text-brand animate-[spin_8s_linear_infinite]" size={48} />
        </div>
        <div className="absolute -top-1 -right-1 bg-surface border border-brand/40 rounded-full p-1.5 shadow">
          <Sparkles aria-hidden="true" className="text-[#C6FF35]" size={16} />
        </div>
        <div className="absolute -bottom-1 -left-1 bg-surface border border-border-muted rounded-full p-1.5 shadow">
          <Music2 aria-hidden="true" className="text-[#3575FF]" size={14} />
        </div>
      </div>

      <h3 className="text-white text-xl font-bold mb-2">No NFTs yet</h3>
      <p className="text-sm text-on-muted max-w-md mb-6 leading-relaxed">
        You don&apos;t own any music NFTs yet. Explore the marketplace to discover and collect
        tracks from your favorite artists.
      </p>
      <Link
        className="px-6 py-2.5 rounded-full bg-brand hover:bg-pink-700 text-white text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-brand/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        href="/marketPlace"
      >
        Browse Marketplace
      </Link>
    </div>
  );
};

export default CollectionEmptyState;
