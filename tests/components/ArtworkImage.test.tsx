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

    const fallback = screen.getByRole('img', { name: 'Cover art for Song unavailable' });
    expect(fallback.tagName).toBe('DIV');
  });

  it('names the unavailable fallback after the item, even with a custom alt', () => {
    render(<ArtworkImage alt="Song cover" src={null} title="Midnight Run" />);

    expect(
      screen.getByRole('img', { name: 'Cover art for Midnight Run unavailable' })
    ).toBeInTheDocument();
  });

  it('never loops when the placeholder itself fails to load', () => {
    render(<ArtworkImage src="https://cdn.example.com/a.jpg" title="Song" />);

    // source -> placeholder -> gradient; further errors cannot re-enter a loop.
    fireEvent.error(screen.getByRole('img', { name: 'Song' }));
    expect(screen.getByRole('img', { name: 'Song' })).toHaveAttribute('src', PLACEHOLDER_COVER);
    fireEvent.error(screen.getByRole('img', { name: 'Song' }));

    const fallback = screen.getByRole('img', { name: 'Cover art for Song unavailable' });
    expect(fallback.tagName).toBe('DIV');
    fireEvent.error(fallback);
    expect(screen.getByRole('img', { name: 'Cover art for Song unavailable' }).tagName).toBe('DIV');
  });

  it('keeps the box size of the broken image: fixed dimensions or fill', () => {
    const { rerender } = render(<ArtworkImage height={120} src={null} title="Song" width={80} />);
    expect(screen.getByRole('img', { name: /unavailable/ })).toHaveStyle({
      width: '80px',
      height: '120px',
    });

    rerender(<ArtworkImage fill src={null} title="Song" />);
    expect(screen.getByRole('img', { name: /unavailable/ })).toHaveStyle({
      width: '100%',
      height: '100%',
    });
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
