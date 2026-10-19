import { describe, it, expect } from 'vitest';
import {
  EMPTY_SMART_PLAYLIST_DRAFT,
  SMART_PLAYLIST_LIMITS,
  buildSmartPlaylistPayload,
  parseRuleList,
  parseSmartPlaylistDraft,
} from '@/lib/smartPlaylist';

describe('parseRuleList', () => {
  it('splits on commas, trims, and drops empty entries', () => {
    expect(parseRuleList(' Afrobeats , , Amapiano,')).toEqual(['Afrobeats', 'Amapiano']);
  });

  it('removes duplicates case-insensitively, keeping the first spelling', () => {
    expect(parseRuleList('Jazz, jazz, JAZZ, Soul')).toEqual(['Jazz', 'Soul']);
  });

  it('returns an empty list for blank input', () => {
    expect(parseRuleList('   ')).toEqual([]);
  });
});

describe('parseSmartPlaylistDraft', () => {
  it('builds a rule from genres, tags, and a saved-within window', () => {
    const result = parseSmartPlaylistDraft({
      genres: 'Afrobeats',
      tags: 'chill, live',
      savedWithinDays: '30',
    });

    expect(result.errors).toEqual([]);
    expect(result.rule).toEqual({
      genres: ['Afrobeats'],
      tags: ['chill', 'live'],
      savedWithinDays: 30,
    });
  });

  it('omits empty lists and the window from the rule', () => {
    const result = parseSmartPlaylistDraft({ ...EMPTY_SMART_PLAYLIST_DRAFT, genres: 'Jazz' });

    expect(result.rule).toEqual({ genres: ['Jazz'] });
  });

  it('requires at least one criterion, matching the backend rule check', () => {
    const result = parseSmartPlaylistDraft(EMPTY_SMART_PLAYLIST_DRAFT);

    expect(result.rule).toBeNull();
    expect(result.errors).toHaveLength(1);
  });

  it.each(['0', '-3', '2.5', 'abc', String(SMART_PLAYLIST_LIMITS.maxSavedWithinDays + 1)])(
    'rejects an invalid saved-within value: %s',
    (savedWithinDays) => {
      const result = parseSmartPlaylistDraft({
        ...EMPTY_SMART_PLAYLIST_DRAFT,
        genres: 'Jazz',
        savedWithinDays,
      });

      expect(result.rule).toBeNull();
      expect(result.errors.join(' ')).toContain('"Saved within"');
    }
  );

  it('rejects entries longer than the length limit', () => {
    const longGenre = 'x'.repeat(SMART_PLAYLIST_LIMITS.maxEntryLength + 1);
    const result = parseSmartPlaylistDraft({ ...EMPTY_SMART_PLAYLIST_DRAFT, genres: longGenre });

    expect(result.rule).toBeNull();
    expect(result.errors).toHaveLength(1);
  });

  it('rejects more entries than the limit', () => {
    const tooMany = Array.from(
      { length: SMART_PLAYLIST_LIMITS.maxEntries + 1 },
      (_, index) => `genre${index}`
    ).join(',');
    const result = parseSmartPlaylistDraft({ ...EMPTY_SMART_PLAYLIST_DRAFT, genres: tooMany });

    expect(result.rule).toBeNull();
    expect(result.errors).toHaveLength(1);
  });
});

describe('buildSmartPlaylistPayload', () => {
  it('builds the POST body the backend expects for a rule-based playlist', () => {
    expect(buildSmartPlaylistPayload('  Late night  ', { genres: ['Jazz'] })).toEqual({
      name: 'Late night',
      isPublic: true,
      isRuleBased: true,
      rule: { genres: ['Jazz'] },
    });
  });
});
