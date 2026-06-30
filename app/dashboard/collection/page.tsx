'use client';

import { ListFilter, Music, UsersRound } from 'lucide-react';
import Image from 'next/image';
import { FiSearch } from 'react-icons/fi';
import { useState, useMemo } from 'react';
import { useNFTCollection } from '@/hooks/useNFTCollection';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const ITEMS_PER_PAGE = 10;

function ipfsImage(cid: string): string {
  if (cid.startsWith('Qm') || cid.startsWith('baf')) return `${IPFS_GATEWAY}${cid}`;
  return '/audio.jpg';
}

const CollectionsPage = () => {
  const { isConnected, nftBalance, songs, isLoading } = useNFTCollection();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    return songs.filter((s) =>
      s.songCID.toLowerCase().includes(search.toLowerCase()) ||
      s.artistAddress.toLowerCase().includes(search.toLowerCase()),
    );
  }, [songs, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedSongs = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const statCards = [
    {
      label: 'Number Of Assets',
      value: isLoading ? '…' : nftBalance.toString(),
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
              <UsersRound size={15} className={accent} aria-hidden="true" />
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
            <FiSearch className="absolute left-3 top-3 text-on-muted" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by CID or address"
              aria-label="Search NFT songs"
              className="w-full pl-10 pr-4 py-2 rounded-full bg-surface-input outline-none border border-border-dark text-sm text-gray-200 placeholder:text-gray-500"
            />
          </div>
          <button
            aria-label="Filter collections"
            className="flex items-center font-bold gap-1 px-4 py-2 rounded-full border border-border-dark bg-surface-input text-sm text-on-muted"
          >
            Filter
            <ListFilter size={15} className="ml-2" aria-hidden="true" />
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="flex flex-col items-center justify-center py-20 text-on-muted">
          <Music size={48} className="mb-4 opacity-40" aria-hidden="true" />
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

      {isConnected && !isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-on-muted">
          <Music size={48} className="mb-4 opacity-40" aria-hidden="true" />
          <p className="text-lg font-medium">No NFT songs found for this wallet</p>
        </div>
      )}

      {isConnected && !isLoading && paginatedSongs.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {paginatedSongs.map((song) => (
              <div key={song.songId.toString()} className="hover:bg-surface-hover p-3 rounded-lg">
                <div className="w-full aspect-square rounded-md overflow-hidden mb-3">
                  <Image
                    src={ipfsImage(song.songCID)}
                    alt={`Song #${song.songId}`}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/audio.jpg'; }}
                  />
                </div>
                <p className="text-sm font-semibold">Song #{song.songId.toString()}</p>
                <p className="text-xs text-gray-400">
                  {song.artistAddress.slice(0, 6)}…{song.artistAddress.slice(-4)}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{song.totalStreams.toString()} streams</span>
                  <button className="px-3 py-1 text-xs bg-surface border border-border-dark rounded-full hover:bg-[#333]">
                    Sell Now
                  </button>
                </div>
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
        </>
      )}
    </div>
  );
};

export default CollectionsPage;
