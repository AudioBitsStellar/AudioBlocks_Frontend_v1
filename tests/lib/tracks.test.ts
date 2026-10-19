import { describe, expect, it } from 'vitest';
import { isTrackAvailable, songToTrack } from '@/lib/tracks';
const song = {
  id: 'one',
  title: 'One',
  status: 'ready',
  flagged: false,
  hlsMasterUrl: 'https://storage.example/master.m3u8',
};
describe('song availability contract', () => {
  it('accepts ready unflagged songs without exposing storage URLs', () => {
    const track = songToTrack(song);
    expect(isTrackAvailable(track)).toBe(true);
    expect(track.url).toBeUndefined();
  });
  it.each([
    { flagged: true },
    { status: 'failed' },
    { status: 'processing' },
    { available: false },
    { isAvailable: false },
    { hlsMasterUrl: null },
    { hlsMasterUrl: '' },
  ])('rejects unavailable or missing streams: %j', (changes) => {
    expect(isTrackAvailable(songToTrack({ ...song, ...changes }))).toBe(false);
  });
  it('preserves a deleted song row', () => {
    expect(songToTrack(null, 'deleted')).toMatchObject({
      id: 'deleted',
      title: 'Deleted song',
      available: false,
    });
  });
});
