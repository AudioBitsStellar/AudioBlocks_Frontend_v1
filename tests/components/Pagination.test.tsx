import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from '@/components/ui/pagination';

describe('Pagination Component', () => {
  it('renders page numbers correctly for totalPages <= 7', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 5' })).toBeInTheDocument();
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });

  it('renders ellipsis for large page counts (> 7)', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={5} totalPages={10} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 10' })).toBeInTheDocument();
    expect(screen.getAllByText('...')).toHaveLength(2);
  });

  it('disables previous button on first page and next button on last page', () => {
    const { rerender } = render(<Pagination currentPage={1} totalPages={10} />);
    const prevBtn = screen.getByRole('button', { name: /go to previous page/i });
    const nextBtn = screen.getByRole('button', { name: /go to next page/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    rerender(<Pagination currentPage={10} totalPages={10} />);
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });

  it('calls onPageChange when page button or next/prev is clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole('button', { name: /go to previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: /go to next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('marks current page with aria-current="page"', () => {
    render(<Pagination currentPage={3} totalPages={5} />);
    const page3Btn = screen.getByRole('button', { name: 'Page 3' });
    expect(page3Btn).toHaveAttribute('aria-current', 'page');
  });
});
