'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ListFilter, Music, Search, UsersRound, Send, DollarSign } from 'lucide-react';
import { useAccount } from 'wagmi';
import { NftTransfer } from '@/components/NftTransfer';
import { ListNFTDialog } from '@/components/marketplace/ListNFTDialog';
import { ArtworkImage } from '@/components/ui/ArtworkImage';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useNFTCollection } from '@/hooks/useNFTCollection';
import { useOwnedCollection } from '@/hooks/useOwnedCollection';
import { filterOwnedSongs, songCoverSrc, toOwnedNFT, type OwnedNFT } from '@/lib/collectionSongs';

const ITEMS_PER_PAGE = 10;

const CollectionsPage = () => {
  const { address, isConnected } = useAccount();
  const { nftBalance, isLoading: chainLoading } = useNFTCollection();
  const { data: ownedNfts = [], isLoading: backendLoading } = useOwnedCollection();

  const isLoading = (chainLoading || backendLoading) && isConnected;

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNFT, setSelectedNFT] = useState<bigint | null>(null);
  const [listingNFT, setListingNFT] = useState<OwnedNFT | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const songs: OwnedNFT[] = useMemo(() => {
    if (!address || ownedNfts.length === 0) return [] as OwnedNFT[];
    return ownedNfts.map(toOwnedNFT);
  }, [address, ownedNfts]);

  const filtered = useMemo(() => filterOwnedSongs(songs, search), [songs, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedSongs = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Paging is purely client-side, so it applies immediately; loading is only
  // shown while the owned NFTs are actually being fetched.
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const loadMore = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: currentPage < totalPages,
    isLoading: false,
    enabled: isConnected && !isLoading && songs.length > 0,
  });

  const statCards = [
    {
      label: 'Number Of Assets',
      value: isLoading ? '…' : (nftBalance ?? BigInt(0)).toString(),
      accent: 'text-[#3575FF]',
      bg: 'bg-[#3575ff27]',
    },
    {
      label: 'Total Streams',
      value: isLoading ? '…' : songs.reduce((acc, s) => acc + s.totalStreams, BigInt(0)).toString(),
      accent: 'text-[#35FF97]',
      bg: 'bg-[#35ff9725]',
    },
    {
      label: 'Total Likes',
      value: isLoading ? '…' : songs.reduce((acc, s) => acc + s.totalLikes, BigInt(0)).toString(),
      accent: 'text-[#C6FF35]',
      bg: 'bg-[#c6ff3531]',
    },
  ];

  return (
    <div className="text-white min-h-screen">
      <div className="text-sm text-on-muted mb-4">
        <span className="text-white">Profile</span> / Collections
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {statCards.map(({ label, value, accent, bg }) => (
          <div
            key={label}
            className="bg-surface rounded-xl hover:border hover:border-border-muted p-5 flex items-center"
          >
            <div className={`rounded-full p-3 mr-5 ${bg}`}>
              <UsersRound aria-hidden="true" className={accent} size={15} />
            </div>
            <div className="font-semibold">
              <p className="text-sm text-on-muted">{label}</p>
              <h2 className="text-xl text-white mt-2">{value}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl text-on-subtle font-semibold">My NFT Songs</h2>
        <div className="flex gap-3 items-center w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search aria-hidden="true" className="absolute left-3 top-3 text-on-muted" />
            <input
              aria-label="Search NFT songs"
              className="w-full pl-10 pr-4 py-2 rounded-full bg-surface-input outline-none border border-border-dark text-sm text-gray-200 placeholder:text-gray-500"
              placeholder="Search by title, artist, CID or address"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button
            aria-label="Filter collections"
            className="flex items-center font-bold gap-1 px-4 py-2 rounded-full border border-border-dark bg-surface-input text-sm text-on-muted"
          >
            Filter
            <ListFilter aria-hidden="true" className="ml-2" size={15} />
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="flex flex-col items-center justify-center py-20 text-on-muted">
          <Music aria-hidden="true" className="mb-4 opacity-40" size={48} />
          <p className="text-lg font-medium">Connect your wallet to view your NFT collection</p>
        </div>
      )}

      {isConnected && isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg">
              <Skeleton className="w-full aspect-square rounded-md mb-3" />
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {isConnected && !isLoading && !backendLoading && songs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-on-muted">
          <Music aria-hidden="true" className="mb-4 opacity-40" size={64} />
          <h3 className="text-white text-lg font-semibold mb-2">No NFTs yet</h3>
          <p className="text-sm max-w-sm mb-6">
            You don&apos;t own any music NFTs yet. Explore the marketplace to discover and collect
            tracks from your favorite artists.
          </p>
          <Link
            className="px-6 py-2 rounded-full bg-brand hover:bg-pink-700 text-white text-sm font-semibold transition-colors"
            href="/marketPlace"
          >
            Browse Marketplace
          </Link>
        </div>
      )}

      {isConnected &&
        !isLoading &&
        !backendLoading &&
        songs.length > 0 &&
        filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-on-muted">
            <Music aria-hidden="true" className="mb-4 opacity-40" size={48} />
            <p className="text-lg font-medium">No NFT songs match your search</p>
          </div>
        )}

      {isConnected && !isLoading && !backendLoading && (
        <div ref={scrollContainerRef} className="space-y-6">
          {paginatedSongs.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {paginatedSongs.map((song) => (
                  <div
                    key={song.songId.toString()}
                    className="hover:bg-surface-hover p-3 rounded-lg"
                  >
                    <div className="relative w-full aspect-square rounded-md overflow-hidden mb-3">
                      <ArtworkImage
                        fill
                        alt={`${song.title} cover art`}
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 20vw"
                        src={songCoverSrc(song)}
                        title={song.title}
                      />
                    </div>
                    <p className="text-sm font-semibold truncate" title={song.title}>
                      {song.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate" title={song.artistAddress}>
                      {song.artistName}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <span className="text-xs text-gray-400 flex-1">
                        {song.totalStreams.toString()} streams
                      </span>
                      <button
                        className="p-1.5 text-xs bg-brand/20 border border-brand/40 rounded-full hover:bg-brand/30 transition-colors"
                        title="List for sale"
                        type="button"
                        onClick={() => setListingNFT(song)}
                      >
                        <DollarSign size={12} />
                      </button>
                      <button
                        className="p-1.5 text-xs bg-surface border border-border-dark rounded-full hover:bg-[#333] transition-colors"
                        title="Transfer NFT"
                        type="button"
                        onClick={() =>
                          setSelectedNFT(selectedNFT === song.songId ? null : song.songId)
                        }
                      >
                        <Send size={12} />
                      </button>
                    </div>
                    {selectedNFT === song.songId && (
                      <div className="mt-3 p-3 bg-surface-hover rounded-lg border border-border-dark">
                        <NftTransfer songId={song.songId} onSuccess={() => setSelectedNFT(null)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pb-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>

              <div ref={sentinelRef} className="h-4" />
            </>
          )}
        </div>
      )}

      {listingNFT && (
        <ListNFTDialog
          songId={listingNFT.songId}
          songTitle={listingNFT.title}
          onClose={() => setListingNFT(null)}
          onSuccess={() => {
            // Refetch owned collection to update the UI
            // The useOwnedCollection hook should refetch automatically
          }}
        />
      )}
    </div>
  );
};

export default CollectionsPage;
