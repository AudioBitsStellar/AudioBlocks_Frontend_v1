'use client';

import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { SmartPlaylistEditor } from '@/components/playlist/SmartPlaylistEditor';
import { useCreateSmartPlaylist } from '@/hooks/usePlaylists';
import {
  EMPTY_SMART_PLAYLIST_DRAFT,
  buildSmartPlaylistPayload,
  parseSmartPlaylistDraft,
} from '@/lib/smartPlaylist';
import type { SmartPlaylistDraft } from '@/lib/smartPlaylist';

interface CreateSmartPlaylistDialogProps {
  open: boolean;
  onClose: () => void;
}

const fieldClass =
  'w-full rounded-lg bg-[#2a2a2a] border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]';

/** Name plus rule editor. Validation runs on submit; the backend re-checks the rule. */
export function CreateSmartPlaylistDialog({ open, onClose }: CreateSmartPlaylistDialogProps) {
  const nameId = useId();
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<SmartPlaylistDraft>(EMPTY_SMART_PLAYLIST_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);
  const create = useCreateSmartPlaylist();

  // Start each opening with a clean form.
  useEffect(() => {
    if (open) {
      setName('');
      setDraft(EMPTY_SMART_PLAYLIST_DRAFT);
      setErrors([]);
    }
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nameErrors = name.trim() ? [] : ['Give your playlist a name.'];
    const { rule, errors: ruleErrors } = parseSmartPlaylistDraft(draft);
    const allErrors = [...nameErrors, ...ruleErrors];

    setErrors(allErrors);
    if (allErrors.length > 0 || !rule || create.isPending) return;

    create.mutate(buildSmartPlaylistPayload(name, rule), { onSuccess: onClose });
  };

  return (
    <Modal open={open} size="md" title="New smart playlist" onClose={onClose}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white" htmlFor={nameId}>
            Name
          </label>
          <input
            className={fieldClass}
            id={nameId}
            maxLength={100}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <SmartPlaylistEditor draft={draft} errors={errors} onChange={setDraft} />

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 transition-colors"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#D2045B] text-white hover:bg-[#b80350] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={create.isPending}
            type="submit"
          >
            {create.isPending ? 'Creating…' : 'Create playlist'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateSmartPlaylistDialog;
