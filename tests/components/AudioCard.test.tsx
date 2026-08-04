import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AudioCard from '@/components/AudioCard';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => {
    const { src, alt, onError, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} data-testid="next-image" src={src} onError={onError} {...rest} />;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: React.ComponentProps<'a'>) => (
    <a data-testid="next-link" href={href}>
      {children}
    </a>
  ),
}));

describe('AudioCard Component', () => {
  const defaultProps = {
    title: 'Neon Nights',
    artist: 'Synthwave Dreams',
    imageUrl: '/covers/neon-nights.jpg',
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Size Variants', () => {
    it('renders the small variant correctly', () => {
      render(<AudioCard {...defaultProps} size="sm" />);
      const card = screen.getByRole('button');
      // 'sm' maps to 'compact' which uses 'p-2'
      expect(card).toHaveClass('p-2');
    });

    it('renders the medium variant correctly', () => {
      render(<AudioCard {...defaultProps} size="md" />);
      const card = screen.getByRole('button');
      // 'md' maps to 'standard' which uses 'p-3'
      expect(card).toHaveClass('p-3');
    });

    it('renders the large variant correctly', () => {
      render(<AudioCard {...defaultProps} size="lg" />);
      const card = screen.getByRole('button');
      // 'lg' maps to 'wide' which uses 'sm:p-5'
      expect(card).toHaveClass('sm:p-5');
    });
  });

  describe('Interactions', () => {
    it('fires onClick handler when clicked', async () => {
      const user = userEvent.setup();
      render(<AudioCard {...defaultProps} />);

      const card = screen.getByRole('button');
      await user.click(card);

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard interaction (Enter key)', () => {
      render(<AudioCard {...defaultProps} />);

      const card = screen.getByRole('button');
      card.focus();
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard interaction (Space key)', () => {
      render(<AudioCard {...defaultProps} />);

      const card = screen.getByRole('button');
      card.focus();
      fireEvent.keyDown(card, { key: ' ', code: 'Space' });

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading States', () => {
    it('renders loading skeleton when isLoading is true', () => {
      render(<AudioCard {...defaultProps} isLoading={true} />);

      // Assumes a data-testid="audio-card-skeleton" is used for the skeleton
      const skeleton = screen.getByTestId('audio-card-skeleton');
      expect(skeleton).toBeInTheDocument();

      // Ensures the real content is not present
      expect(screen.queryByText(defaultProps.title)).not.toBeInTheDocument();
    });
  });

  describe('Image and Fallback', () => {
    it('renders the correct alt text for the image', () => {
      render(<AudioCard {...defaultProps} altText="Custom Cover Alt" />);

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('alt', 'Custom Cover Alt');
    });

    it('uses default alt text if altText prop is not provided', () => {
      render(<AudioCard {...defaultProps} />);

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('alt', `${defaultProps.title} by ${defaultProps.artist}`);
    });

    it('displays fallback image when image fails to load', () => {
      render(<AudioCard {...defaultProps} />);

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('src', defaultProps.imageUrl);

      // Simulate image load error
      fireEvent.error(image);

      // Verify that it switches to the fallback div
      const fallback = screen.getByRole('img', {
        name: `${defaultProps.title} by ${defaultProps.artist}`,
      });
      expect(fallback).toBeInTheDocument();
      expect(fallback.tagName.toLowerCase()).toBe('div');
    });
  });
});
