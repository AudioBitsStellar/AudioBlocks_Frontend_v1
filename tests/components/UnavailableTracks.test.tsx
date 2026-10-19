import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlayCollection from '@/components/music/PlayCollection';
import TrackList from '@/components/music/TrackList';
import { PlaybackProvider } from '@/context/PlaybackContext';
describe('unavailable track rows', () => {
  const tracks = [
    { id: 'gone', title: 'Removed song', artist: 'Artist', cover: '', available: false },
  ];
  it('labels unavailable songs, exposes the reason to keyboards and disables actions', () => {
    render(
      <PlaybackProvider>
        <TrackList tracks={tracks} />
        <PlayCollection tracks={tracks} />
      </PlaybackProvider>
    );
    expect(screen.getByText('Unavailable')).toHaveAttribute('tabIndex', '0');
    expect(screen.getByText('Unavailable')).toHaveAttribute(
      'title',
      expect.stringContaining('removed')
    );
    for (const label of ['Play Removed song', 'Queue Removed song', 'Play all', 'Shuffle'])
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Queue Removed song' }));
  });
});
