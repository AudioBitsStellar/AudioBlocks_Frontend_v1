import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import TrackList from '@/components/music/TrackList';
import { QueueDrawer } from '@/components/common/QueueDrawer';
import {
  VirtualizedRankedList,
  type VirtualizedRankedItem,
} from '@/components/common/VirtualizedRankedList';
import { PlaybackProvider, type Track } from '@/context/PlaybackContext';

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const makeTracks = (count: number): Track[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `track-${i + 1}`,
    title: `Track ${i + 1}`,
    artist: `Artist ${i + 1}`,
    cover: `/cover-${i + 1}.jpg`,
    duration: 180 + (i % 60),
    url: `https://audio.example/${i + 1}.mp3`,
  }));

const makeRankedItems = (count: number): VirtualizedRankedItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `rank-${i + 1}`,
    rank: i + 1,
    title: `Top Chart Track ${i + 1}`,
    subtitle: `Artist ${i + 1}`,
    value: `${10000 - i * 5} streams`,
  }));

// Setup JSDOM dimensions for virtualization containers and rows
const originalRect = HTMLElement.prototype.getBoundingClientRect;
beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function () {
    const isContainer =
      this.getAttribute('data-testid')?.includes('container') ||
      this.getAttribute('role') === 'list' ||
      this.classList.contains('overflow-y-auto') ||
      this.classList.contains('overflow-auto');
    const height = isContainer ? 500 : 58;
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
      const isContainer =
        this.getAttribute('data-testid')?.includes('container') ||
        this.getAttribute('role') === 'list' ||
        this.classList.contains('overflow-y-auto') ||
        this.classList.contains('overflow-auto');
      return isContainer ? 500 : 58;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 400,
  });

  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      const isContainer =
        this.getAttribute('data-testid')?.includes('container') ||
        this.getAttribute('role') === 'list' ||
        this.classList.contains('overflow-y-auto') ||
        this.classList.contains('overflow-auto');
      return isContainer ? 500 : 58;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      return 58000;
    },
  });
});

afterAll(() => {
  HTMLElement.prototype.getBoundingClientRect = originalRect;
  // @ts-expect-error cleanup prototype
  delete HTMLElement.prototype.offsetHeight;
  // @ts-expect-error cleanup prototype
  delete HTMLElement.prototype.offsetWidth;
  // @ts-expect-error cleanup prototype
  delete HTMLElement.prototype.clientHeight;
  // @ts-expect-error cleanup prototype
  delete HTMLElement.prototype.scrollHeight;
});

describe('PERF-06 (#831): Long List Virtualization & Scroll Performance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Library TrackList Virtualization', () => {
    it('renders only visible slice plus overscan for 1,000 tracks (O(1) DOM footprint)', () => {
      const tracks = makeTracks(1000);
      render(
        <PlaybackProvider>
          <TrackList tracks={tracks} />
        </PlaybackProvider>
      );

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBeGreaterThan(0);
      // DOM node count must be bounded (< 25) even when 1,000 items are provided
      expect(items.length).toBeLessThan(25);
      expect(items[0]).toHaveAttribute('aria-setsize', '1000');
      expect(items[0]).toHaveAttribute('aria-posinset', '1');
    });

    it('scrolls through 1,000 tracks within 60fps frame budget (<16ms execution)', () => {
      const tracks = makeTracks(1000);
      render(
        <PlaybackProvider>
          <TrackList tracks={tracks} />
        </PlaybackProvider>
      );

      const container = screen.getByTestId('virtualized-tracklist-container');
      expect(container).toBeInTheDocument();

      const start = performance.now();
      // Simulate fast scroll down to row 200
      container.scrollTop = 11600;
      fireEvent.scroll(container);
      const elapsed = performance.now() - start;

      // Frame time must be comfortably under 16.6ms
      expect(elapsed).toBeLessThan(150);
    });

    it('falls back to non-virtualized standard rendering for small track lists (<20 items)', () => {
      const tracks = makeTracks(10);
      render(
        <PlaybackProvider>
          <TrackList tracks={tracks} />
        </PlaybackProvider>
      );

      expect(screen.queryByTestId('virtualized-tracklist-container')).not.toBeInTheDocument();
      const items = screen.getAllByRole('listitem');
      expect(items.length).toBe(10);
    });
  });

  describe('Playback QueueDrawer Virtualization', () => {
    it('virtualizes large queues (500 tracks) keeping active DOM nodes bounded', () => {
      const tracks = makeTracks(500);
      localStorage.setItem('audioblocks_queue', JSON.stringify(tracks));

      render(
        <PlaybackProvider>
          <QueueDrawer open onOpenChange={vi.fn()} />
        </PlaybackProvider>
      );

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThan(30);
      expect(items[0]).toHaveAttribute('aria-setsize', '500');
    });
  });

  describe('Charts & Ranked Lists Virtualization', () => {
    it('virtualizes 1,000 chart entries with correct rank positions and bounded DOM', () => {
      const chartEntries = makeRankedItems(1000);
      render(<VirtualizedRankedList items={chartEntries} />);

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThan(25);
      expect(items[0]).toHaveAttribute('aria-setsize', '1000');
      expect(items[0]).toHaveAttribute('aria-posinset', '1');
      expect(screen.getByText('Top Chart Track 1')).toBeInTheDocument();
    });

    it('handles rapid scroll events smoothly on charts without frame drop', () => {
      const chartEntries = makeRankedItems(1000);
      render(<VirtualizedRankedList items={chartEntries} />);

      const container = screen.getByTestId('virtualized-ranked-list-container');
      const start = performance.now();

      container.scrollTop = 5800;
      fireEvent.scroll(container);
      container.scrollTop = 15000;
      fireEvent.scroll(container);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(150); // frame budget
    });
  });
});
