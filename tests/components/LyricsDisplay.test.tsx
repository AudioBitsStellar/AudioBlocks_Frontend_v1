import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LyricsDisplay } from '@/components/LyricsDisplay';

describe('LyricsDisplay (#583)', () => {
  it('shows a loading status while lyrics are fetched', () => {
    render(<LyricsDisplay isError={false} isLoading lyrics={undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading lyrics');
  });

  it('shows an empty state when the song has no lyrics', () => {
    render(<LyricsDisplay isError={false} isLoading={false} lyrics={null} />);
    expect(screen.getByText('No lyrics available for this song.')).toBeInTheDocument();
  });

  it('shows an error with a retry action', () => {
    const onRetry = vi.fn();
    render(<LyricsDisplay isError isLoading={false} lyrics={undefined} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load lyrics.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the lyrics in a keyboard-focusable scroll region', () => {
    render(<LyricsDisplay isError={false} isLoading={false} lyrics={'Line one\nLine two'} />);

    const region = screen.getByRole('region', { name: 'Lyrics' });
    expect(region).toHaveTextContent('Line one');
    expect(region).toHaveTextContent('Line two');
    expect(region).toHaveAttribute('tabindex', '0');
  });
});
