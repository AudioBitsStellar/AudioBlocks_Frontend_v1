/**
 * Smart (rule-based) playlist rules. The shape and validation mirror the backend
 * `PlaylistRule` and `PlaylistService.assertValidRule`: at least one criterion,
 * and `savedWithinDays` must be a positive integer when present.
 */

export interface SmartPlaylistRule {
  tags?: string[];
  genres?: string[];
  /** Only songs added to the platform within the last N days. */
  savedWithinDays?: number;
}

/** Raw form values. Lists are comma-separated text until they are parsed. */
export interface SmartPlaylistDraft {
  tags: string;
  genres: string;
  savedWithinDays: string;
}

export const EMPTY_SMART_PLAYLIST_DRAFT: SmartPlaylistDraft = {
  tags: '',
  genres: '',
  savedWithinDays: '',
};

/** Client-side limits. The backend does not state these; they keep rules reasonable. */
export const SMART_PLAYLIST_LIMITS = {
  maxEntries: 20,
  maxEntryLength: 50,
  maxSavedWithinDays: 3650,
} as const;

/** Splits comma-separated input into trimmed, de-duplicated (case-insensitive) entries. */
export function parseRuleList(input: string): string[] {
  const seen = new Set<string>();
  const entries: string[] = [];

  for (const raw of input.split(',')) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(value);
  }

  return entries;
}

/**
 * Parses and validates the editor draft.
 *
 * @returns The rule when valid, otherwise `rule: null` and a list of messages to show.
 */
export function parseSmartPlaylistDraft(draft: SmartPlaylistDraft): {
  rule: SmartPlaylistRule | null;
  errors: string[];
} {
  const { maxEntries, maxEntryLength, maxSavedWithinDays } = SMART_PLAYLIST_LIMITS;
  const errors: string[] = [];

  const tags = parseRuleList(draft.tags);
  const genres = parseRuleList(draft.genres);

  if (tags.length > maxEntries || genres.length > maxEntries) {
    errors.push(`Use at most ${maxEntries} tags and at most ${maxEntries} genres.`);
  }
  if ([...tags, ...genres].some((entry) => entry.length > maxEntryLength)) {
    errors.push(`Each tag and genre must be ${maxEntryLength} characters or fewer.`);
  }

  let savedWithinDays: number | undefined;
  const dayText = draft.savedWithinDays.trim();
  if (dayText !== '') {
    const days = Number(dayText);
    if (!Number.isInteger(days) || days <= 0 || days > maxSavedWithinDays) {
      errors.push(`"Saved within" must be a whole number of days from 1 to ${maxSavedWithinDays}.`);
    } else {
      savedWithinDays = days;
    }
  }

  if (errors.length === 0 && tags.length === 0 && genres.length === 0 && !savedWithinDays) {
    errors.push('Add at least one tag, genre, or a "saved within" window.');
  }

  if (errors.length > 0) return { rule: null, errors };

  const rule: SmartPlaylistRule = {};
  if (tags.length > 0) rule.tags = tags;
  if (genres.length > 0) rule.genres = genres;
  if (savedWithinDays !== undefined) rule.savedWithinDays = savedWithinDays;

  return { rule, errors: [] };
}

export interface SmartPlaylistPayload {
  name: string;
  isPublic: boolean;
  isRuleBased: true;
  rule: SmartPlaylistRule;
}

/** Builds the `POST /api/playlists` body for a smart playlist. */
export function buildSmartPlaylistPayload(
  name: string,
  rule: SmartPlaylistRule,
  isPublic = true
): SmartPlaylistPayload {
  return { name: name.trim(), isPublic, isRuleBased: true, rule };
}
