'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import ConnectWalletPrompt from '@/components/auth/ConnectWalletPrompt';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import { useCommentReactions } from '@/hooks/useCommentReactions';
import { REACTION_META, REACTION_TYPES, type ReactionType } from '@/lib/commentReactionService';

/**
 * Reaction buttons under a comment (#577). Everyone sees the counts; signed-in
 * users toggle a reaction instantly (rolled back if the API fails), and
 * signed-out users are asked to log in instead.
 */
export function CommentReactions({
  commentId,
  onPromptOpenChange,
}: {
  commentId: string | number;
  /** Lets a parent with outside-click handling ignore clicks in the login prompt. */
  onPromptOpenChange?: (open: boolean) => void;
}) {
  const signedIn = useHasAuthSession();
  const { counts, mine, toggle } = useCommentReactions(commentId);
  const [promptOpen, setPromptOpen] = useState(false);

  const setPrompt = (open: boolean) => {
    setPromptOpen(open);
    onPromptOpenChange?.(open);
  };

  const onClick = async (type: ReactionType) => {
    if (!signedIn) {
      setPrompt(true);
      return;
    }
    if ((await toggle(type)) === 'error') {
      toast.error("Couldn't save your reaction. Please try again.");
    }
  };

  return (
    <>
      <div aria-label="Reactions" className="flex items-center gap-1" role="group">
        {REACTION_TYPES.map((type) => {
          const { emoji, label } = REACTION_META[type];
          const chosen = mine.has(type);
          return (
            <button
              key={type}
              aria-label={`${label} (${counts[type]})`}
              aria-pressed={chosen}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                chosen
                  ? 'bg-white/15 text-white ring-1 ring-white/40'
                  : 'text-[#AFB6B2] hover:bg-white/10'
              }`}
              type="button"
              onClick={() => onClick(type)}
            >
              <span aria-hidden="true">{emoji}</span>
              <span>{counts[type]}</span>
            </button>
          );
        })}
      </div>
      {promptOpen && <ConnectWalletPrompt open={promptOpen} onClose={() => setPrompt(false)} />}
    </>
  );
}
