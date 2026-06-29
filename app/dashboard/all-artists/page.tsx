'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { artistsData } from '@/components/common/dashboard/data';

const ITEMS_PER_PAGE = 12;

const AllArtistsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(artistsData.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = artistsData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="text-white min-h-screen">
      <div className="text-sm text-on-muted mb-4">
        <Link href="/dashboard" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">All Artists</span>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button
            variant="outline"
            size="icon"
            className="border-border-dark bg-surface-input text-on-muted hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white font-poppins">All Artists</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {currentItems.map((item) => (
          <div key={item.id} className="hover:bg-surface-hover p-3 rounded-lg transition-colors">
            <div className="w-full aspect-square rounded-md overflow-hidden mb-3">
              <Image
                src={item.image}
                alt={item.song}
                width={300}
                height={300}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm font-bold text-white">{item.song}</p>
            <p className="text-xs text-on-muted">{item.artist}</p>
            <p className="text-sm font-medium text-white">{item.description}</p>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default AllArtistsPage;
