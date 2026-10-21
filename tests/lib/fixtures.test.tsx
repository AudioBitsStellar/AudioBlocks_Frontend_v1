import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));
vi.mock('next/font/google', () => ({ Inter: () => ({ className: 'inter' }) }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/components/common/BuyButton', () => ({ default: () => null }));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('USE_DEMO_DATA (#746)', () => {
  it('is on only when NEXT_PUBLIC_USE_DEMO_DATA is exactly "true"', async () => {
    for (const [value, expected] of [
      ['true', true],
      ['false', false],
      ['1', false],
      ['', false],
    ] as const) {
      vi.stubEnv('NEXT_PUBLIC_USE_DEMO_DATA', value);
      vi.resetModules();
      expect((await import('@/lib/fixtures')).USE_DEMO_DATA).toBe(expected);
    }
  });

  it('is off when the variable is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_DEMO_DATA', undefined as unknown as string);
    delete process.env.NEXT_PUBLIC_USE_DEMO_DATA;
    expect((await import('@/lib/fixtures')).USE_DEMO_DATA).toBe(false);
  });

  it('demoOr returns the data only when enabled', async () => {
    const { demoOr } = await import('@/lib/fixtures');
    expect(demoOr([1], [], true)).toEqual([1]);
    expect(demoOr([1], [], false)).toEqual([]);
  });
});

describe('with the flag unset (production)', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_USE_DEMO_DATA;
  });

  it('starts the player with an empty playlist', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { PlaybackProvider, usePlayback } = await import('@/context/PlaybackContext');

    const { result } = renderHook(() => usePlayback(), { wrapper: PlaybackProvider });

    expect(result.current.playlist).toEqual([]);
  });

  it('shows no demo artists on All Artists', async () => {
    const { default: Page } = await import('@/app/dashboard/all-artists/page');
    const { artistsData } = await import('@/lib/fixtures/dashboard');

    render(<Page />);

    expect(screen.getByText('No artists to show yet.')).toBeInTheDocument();
    expect(screen.queryByText(artistsData[0].artist)).not.toBeInTheDocument();
  });

  it('shows no demo collections on All Collections', async () => {
    const { default: Page } = await import('@/app/dashboard/all-collections/page');

    render(<Page />);

    expect(screen.getByText('No collections to show yet.')).toBeInTheDocument();
  });

  it('shows no demo listings in the marketplace', async () => {
    const { default: NftCollection } = await import('@/components/common/NftCollections');
    const { musicData } = await import('@/lib/fixtures/marketplace');

    render(<NftCollection />);

    expect(screen.queryByText(musicData[0].artistName)).not.toBeInTheDocument();
  });
});

describe('with the flag on (development)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_USE_DEMO_DATA', 'true');
  });

  it('starts the player with the demo playlist', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { PlaybackProvider, usePlayback } = await import('@/context/PlaybackContext');
    const { demoPlaylist } = await import('@/lib/fixtures/playback');

    const { result } = renderHook(() => usePlayback(), { wrapper: PlaybackProvider });

    expect(result.current.playlist).toEqual(demoPlaylist);
  });

  it('lists the demo artists on All Artists', async () => {
    const { default: Page } = await import('@/app/dashboard/all-artists/page');
    const { artistsData } = await import('@/lib/fixtures/dashboard');

    render(<Page />);

    expect(screen.getAllByText(artistsData[0].artist).length).toBeGreaterThan(0);
    expect(screen.queryByText('No artists to show yet.')).not.toBeInTheDocument();
  });

  it('lists the demo listings in the marketplace', async () => {
    const { default: NftCollection } = await import('@/components/common/NftCollections');
    const { musicData } = await import('@/lib/fixtures/marketplace');

    render(<NftCollection />);

    expect(screen.getAllByText(musicData[0].artistName).length).toBeGreaterThan(0);
  });
});
