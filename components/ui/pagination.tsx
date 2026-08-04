'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  children?: React.ReactNode;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className,
  children,
}: PaginationProps) {
  if (children) {
    return (
      <nav
        aria-label="Pagination"
        className={cn('flex items-center justify-center gap-1', className)}
        role="navigation"
      >
        {children}
      </nav>
    );
  }

  const pages = getPageNumbers(currentPage, totalPages);

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav
      aria-label="Pagination Navigation"
      className={cn('flex items-center justify-center gap-1', className)}
      role="navigation"
    >
      <Button
        aria-label="Go to previous page"
        className="border-border-dark bg-surface-input text-on-muted hover:bg-surface-hover hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={currentPage <= 1}
        size="icon"
        variant="outline"
        onClick={handlePrev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, index) =>
        typeof page === 'string' ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="px-2 py-1 text-sm font-medium text-on-muted select-none"
          >
            {page}
          </span>
        ) : (
          <Button
            key={page}
            aria-current={currentPage === page ? 'page' : undefined}
            aria-label={`Page ${page}`}
            className={cn(
              'border-border-dark font-medium transition-colors',
              currentPage === page
                ? 'bg-[#885FA8] text-white hover:bg-[#7a53a0] border-[#885FA8]'
                : 'bg-surface-input text-on-muted hover:bg-surface-hover hover:text-white'
            )}
            size="icon"
            variant={currentPage === page ? 'default' : 'outline'}
            onClick={() => onPageChange?.(page)}
          >
            {page}
          </Button>
        )
      )}

      <Button
        aria-label="Go to next page"
        className="border-border-dark bg-surface-input text-on-muted hover:bg-surface-hover hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={currentPage >= totalPages}
        size="icon"
        variant="outline"
        onClick={handleNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

export default Pagination;
