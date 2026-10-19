'use client';

import { useId, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';
import { COMMENT_MAX_LENGTH } from '@/lib/commentService';
import { sanitizeUserInput } from '@/lib/sanitize';

interface CommentComposerProps {
  /** Receives sanitized, non-empty text. */
  onSubmit: (text: string) => void;
  label: string;
  initialValue?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

/** Comment / reply / edit input, limited to the backend DTO length (#576). */
export function CommentComposer({
  onSubmit,
  label,
  initialValue = '',
  submitLabel = 'Send comment',
  onCancel,
  autoFocus = false,
}: CommentComposerProps) {
  const [text, setText] = useState(initialValue);
  const counterId = useId();

  const submit = () => {
    const clean = sanitizeUserInput(text);
    if (!clean) {
      toast.error('Please enter a comment before sending.');
      return;
    }
    onSubmit(clean);
    setText('');
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center bg-[#2a2a2a] border rounded-md px-4 py-2">
        <textarea
          aria-describedby={counterId}
          aria-label={label}
          autoFocus={autoFocus}
          className="w-full resize-none custom-scrollbar bg-transparent text-white outline-none"
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="Type here"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          aria-label={submitLabel}
          className="cursor-pointer hover:text-[#D2045B] transition"
          type="button"
          onClick={submit}
        >
          <SendHorizonal />
        </button>
      </div>
      <div className="flex items-center justify-between text-[11px] text-[#AFB6B2]">
        <span id={counterId}>
          {text.length}/{COMMENT_MAX_LENGTH}
        </span>
        {onCancel && (
          <button className="hover:text-white" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default CommentComposer;
