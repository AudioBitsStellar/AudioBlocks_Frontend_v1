'use client';

import { useId } from 'react';
import { SMART_PLAYLIST_LIMITS } from '@/lib/smartPlaylist';
import type { SmartPlaylistDraft } from '@/lib/smartPlaylist';

interface SmartPlaylistEditorProps {
  draft: SmartPlaylistDraft;
  onChange: (draft: SmartPlaylistDraft) => void;
  errors?: string[];
}

const fieldClass =
  'w-full rounded-lg bg-[#2a2a2a] border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]';

/**
 * Rule fields for a smart playlist. Songs matching the rules are resolved by the
 * backend at read time, so the editor only collects criteria.
 */
export function SmartPlaylistEditor({ draft, onChange, errors = [] }: SmartPlaylistEditorProps) {
  const tagsId = useId();
  const genresId = useId();
  const daysId = useId();
  const hintId = useId();
  const errorId = useId();

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-semibold text-white mb-1">Smart playlist rules</legend>
      <p className="text-xs text-gray-400" id={hintId}>
        Songs that match any of these rules are added automatically. Separate values with commas.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white" htmlFor={genresId}>
          Genres
        </label>
        <input
          aria-describedby={hintId}
          className={fieldClass}
          id={genresId}
          placeholder="Afrobeats, Amapiano"
          type="text"
          value={draft.genres}
          onChange={(event) => onChange({ ...draft, genres: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white" htmlFor={tagsId}>
          Tags
        </label>
        <input
          aria-describedby={hintId}
          className={fieldClass}
          id={tagsId}
          placeholder="chill, live"
          type="text"
          value={draft.tags}
          onChange={(event) => onChange({ ...draft, tags: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white" htmlFor={daysId}>
          Saved within (days)
        </label>
        <input
          aria-describedby={hintId}
          className={fieldClass}
          id={daysId}
          inputMode="numeric"
          max={SMART_PLAYLIST_LIMITS.maxSavedWithinDays}
          min={1}
          placeholder="30"
          type="number"
          value={draft.savedWithinDays}
          onChange={(event) => onChange({ ...draft, savedWithinDays: event.target.value })}
        />
      </div>

      {errors.length > 0 && (
        <ul className="text-sm text-red-400 list-disc pl-5" id={errorId} role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

export default SmartPlaylistEditor;
