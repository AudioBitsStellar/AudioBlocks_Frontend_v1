/* eslint-disable @next/next/no-img-element -- next/image is mocked for this unit test. */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Player from '@/components/common/Player';
import { PlaybackProvider, usePlayback } from '@/context/PlaybackContext';
vi.mock('@/hooks/useMediaSession', () => ({ useMediaSession: () => {} }));
vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
function Harness() {
  const { playTrack, recentlyPlayed } = usePlayback();
  return (
    <>
      <button
        onClick={() =>
          playTrack({
            id: 'live',
            title: 'Integration track',
            artist: 'Artist',
            cover: '',
            url: '/tone.mp3',
          })
        }
      >
        Start integration
      </button>
      <output aria-label="Recent count">{recentlyPlayed.length}</output>
      <Player />
    </>
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});
describe('player with the real playback provider', () => {
  it('records a track once without a context update loop', () => {
    render(
      <PlaybackProvider>
        <Harness />
      </PlaybackProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start integration' }));
    expect(screen.getByLabelText('Recent count')).toHaveTextContent('1');
  });
});
