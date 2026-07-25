import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AudioCard from '@/components/AudioCard';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    const { src, alt, onError, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} onError={onError} data-testid="next-image" {...rest} />;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => (
    <a href={href} data-testid="next-link">
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
      // Update this assertion based on actual class names used in AudioCard
      expect(card).toHaveClass('size-sm'); 
    });

    it('renders the medium variant correctly', () => {
      render(<AudioCard {...defaultProps} size="md" />);
      const card = screen.getByRole('button');
      expect(card).toHaveClass('size-md');
    });

    it('renders the large variant correctly', () => {
      render(<AudioCard {...defaultProps} size="lg" />);
      const card = screen.getByRole('button');
      expect(card).toHaveClass('size-lg');
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
      
      // Verify that src switches to the fallback image
      expect(image).toHaveAttribute('src', '/placeholder-cover.svg');
    });
  });
});
