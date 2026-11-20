import { describe, expect, it } from 'vitest';
import { isTrackAvailable, isTrackHiddenByExplicitFilter, songToTrack } from '@/lib/tracks';
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

describe('explicit content advisory (#855)', () => {
  it('trusts an explicit backend flag over the title heuristic', () => {
    expect(songToTrack({ ...song, title: 'Clean Title', explicit: true }).explicit).toBe(true);
  });

  it('trusts a clean backend advisory even for a flagged-sounding title', () => {
    expect(
      songToTrack({ ...song, title: 'fuck it all', advisory: 'clean' }).explicit
    ).toBe(false);
  });

  it('falls back to the title heuristic when the backend has no advisory', () => {
    expect(songToTrack({ ...song, title: 'fuck it all' }).explicit).toBe(true);
    expect(songToTrack({ ...song, title: 'Clean Title' }).explicit).toBe(false);
  });

  it('hides an explicit track only when the listener has not opted in', () => {
    const track = songToTrack({ ...song, explicit: true });
    expect(isTrackHiddenByExplicitFilter(track, false)).toBe(true);
    expect(isTrackHiddenByExplicitFilter(track, true)).toBe(false);
  });

  it('never hides a clean track regardless of the preference', () => {
    const track = songToTrack({ ...song, explicit: false });
    expect(isTrackHiddenByExplicitFilter(track, false)).toBe(false);
  });
});
