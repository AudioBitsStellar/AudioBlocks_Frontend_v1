import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArtworkImage, PLACEHOLDER_COVER } from '@/components/ui/ArtworkImage';

// Hoisted above the imports, so lib/ipfs reads this gateway when it loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_IPFS_GATEWAY = 'https://example.mypinata.cloud';
});

vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: React.ComponentProps<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} onError={onError} />
  ),
}));

const CID = 'QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng';

describe('ArtworkImage', () => {
  it('falls back from the primary gateway to the public gateway, then the placeholder', () => {
    render(<ArtworkImage src={`ipfs://${CID}`} title="Song" />);
    const image = screen.getByRole('img', { name: 'Song' });

    expect(image).toHaveAttribute('src', `https://example.mypinata.cloud/ipfs/${CID}`);

    fireEvent.error(image);
    expect(screen.getByRole('img', { name: 'Song' })).toHaveAttribute(
      'src',
      `https://ipfs.io/ipfs/${CID}`
    );

    fireEvent.error(screen.getByRole('img', { name: 'Song' }));
    expect(screen.getByRole('img', { name: 'Song' })).toHaveAttribute('src', PLACEHOLDER_COVER);
  });

  it('loads non-IPFS URLs directly and falls back to the placeholder on error', () => {
    const s3 = 'https://bucket.s3.amazonaws.com/covers/a.jpg';
    render(<ArtworkImage src={s3} title="Song" />);

    const image = screen.getByRole('img', { name: 'Song' });
    expect(image).toHaveAttribute('src', s3);

    fireEvent.error(image);
    expect(screen.getByRole('img', { name: 'Song' })).toHaveAttribute('src', PLACEHOLDER_COVER);
  });

  it('renders the gradient when every source fails, never a broken image', () => {
    render(<ArtworkImage src="https://bucket.s3.amazonaws.com/a.jpg" title="Song" />);

    fireEvent.error(screen.getByRole('img', { name: 'Song' }));
    fireEvent.error(screen.getByRole('img', { name: 'Song' }));

    expect(screen.getByRole('img', { name: 'Song' }).tagName).toBe('DIV');
  });

  it('restarts the fallback chain when src changes', () => {
    const { rerender } = render(<ArtworkImage src="https://cdn.example.com/a.jpg" title="Song" />);
    fireEvent.error(screen.getByRole('img', { name: 'Song' }));

    rerender(<ArtworkImage src="https://cdn.example.com/b.jpg" title="Song" />);
    expect(screen.getByRole('img', { name: 'Song' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/b.jpg'
    );
  });
});
