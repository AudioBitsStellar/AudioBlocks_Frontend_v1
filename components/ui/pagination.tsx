'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];

  if (currentPage <= 3) {
    pages.push(1, 2, 3, 4, '...', totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
  }

  return pages;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} role="navigation" aria-label="Pagination">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="border-border-dark bg-surface-input text-on-muted hover:bg-surface-hover"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, index) =>
        typeof page === 'string' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-on-muted">
            {page}
          </span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(page)}
            className={cn(
              'border-border-dark',
              currentPage === page
                ? 'bg-[#885FA8] text-white hover:bg-[#7a53a0]'
                : 'bg-surface-input text-on-muted hover:bg-surface-hover'
            )}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="border-border-dark bg-surface-input text-on-muted hover:bg-surface-hover"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
