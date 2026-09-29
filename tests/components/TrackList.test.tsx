import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import TrackList, { type TrackListItem } from '@/components/common/dashboard/TrackList';

const playTrack = vi.fn();
vi.mock('@/context/PlaybackContext', () => ({ usePlayback: () => ({ playTrack }) }));

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => {
    const { src, alt } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} src={src} />;
  },
}));

const makeTracks = (n: number): TrackListItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    title: `Track ${i}`,
    artist: 'Artist',
    cover: '/cover.jpg',
    duration: '3:00',
    variant: i % 10 === 0 ? 'wide' : 'compact',
  }));

// jsdom has no layout: give the scroll container a 400px viewport and rows 80px.
const originalRect = HTMLElement.prototype.getBoundingClientRect;
beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function () {
    const height = this.getAttribute('role') === 'list' ? 400 : 80;
    return {
      width: 400,
      height,
      top: 0,
      left: 0,
      right: 400,
      bottom: height,
      x: 0,
      y: 0,
      toJSON() {},
    };
  };
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return this.getAttribute('role') === 'list' ? 400 : 80;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 400,
  });
});
afterAll(() => {
  HTMLElement.prototype.getBoundingClientRect = originalRect;
  // @ts-expect-error restoring jsdom's inherited getters
  delete HTMLElement.prototype.offsetHeight;
  // @ts-expect-error restoring jsdom's inherited getters
  delete HTMLElement.prototype.offsetWidth;
});

describe('TrackList virtualization', () => {
  it('renders only visible rows plus overscan for 1000 tracks', () => {
    render(<TrackList tracks={makeTracks(1000)} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(20);
    expect(rows[0]).toHaveAttribute('aria-setsize', '1000');
  });

  it('keeps rows keyed by track id across data refreshes', () => {
    const tracks = makeTracks(1000);
    const { rerender } = render(<TrackList tracks={tracks} />);
    const first = screen.getByText('Track 0').closest('[role="listitem"]');
    rerender(<TrackList tracks={tracks.map((t) => ({ ...t }))} />);
    expect(screen.getByText('Track 0').closest('[role="listitem"]')).toBe(first);
  });

  it('moves focus to the next row with ArrowDown', async () => {
    render(<TrackList tracks={makeTracks(1000)} />);
    const firstCard = screen.getByRole('button', { name: /^Track 0/ });
    firstCard.focus();
    fireEvent.keyDown(firstCard, { key: 'ArrowDown' });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Track 1/ }));
  });

  it('plays a track when its card is clicked', () => {
    render(<TrackList tracks={makeTracks(5)} />);
    fireEvent.click(screen.getByRole('button', { name: /^Track 3/ }));
    expect(playTrack).toHaveBeenCalledWith(expect.objectContaining({ id: 't3' }));
  });
});
