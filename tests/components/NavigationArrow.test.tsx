import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NextArrow, PrevArrow } from '@/components/common/dashboard/landing/NavigationArrow';

describe('carousel navigation arrows (#34)', () => {
  it.each([
    ['Next slide', NextArrow],
    ['Previous slide', PrevArrow],
  ])('renders %s as a keyboard accessible button and calls its handler', (label, Arrow) => {
    const onClick = vi.fn();
    render(<Arrow label={label} onClick={onClick} />);
    const button = screen.getByRole('button', { name: label });

    expect(button).toHaveClass('h-11', 'w-11');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
