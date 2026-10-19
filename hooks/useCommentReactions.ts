'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  REACTION_TYPES,
  fetchCommentReactions,
  getCurrentUserId,
  toggleCommentReaction,
  type ReactionType,
} from '@/lib/commentReactionService';

export type ReactionCounts = Record<ReactionType, number>;
/** `busy`: a toggle of that type is already in flight, so the click was ignored. */
export type ToggleResult = 'ok' | 'error' | 'busy';

const zeroCounts = (): ReactionCounts =>
  Object.fromEntries(REACTION_TYPES.map((t) => [t, 0])) as ReactionCounts;

/**
 * Reaction state for one comment (#577): per-type counts plus which types the
 * current user has chosen. `toggle` updates optimistically and rolls back if
 * the API call fails.
 */
export function useCommentReactions(commentId: string | number) {
  const [counts, setCounts] = useState<ReactionCounts>(zeroCounts);
  const [mine, setMine] = useState<Set<ReactionType>>(new Set());
  const [pending, setPending] = useState<Set<ReactionType>>(new Set());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const me = getCurrentUserId();
    fetchCommentReactions(commentId)
      .then((reactions) => {
        if (!mounted.current) return;
        const next = zeroCounts();
        const chosen = new Set<ReactionType>();
        for (const r of reactions) {
          if (!(REACTION_TYPES as readonly string[]).includes(r.type)) continue;
          next[r.type] = r.count;
          if (me && r.users?.some((u) => String(u.id) === me)) chosen.add(r.type);
        }
        setCounts(next);
        setMine(chosen);
      })
      .catch(() => {
        /* counts stay at zero; reacting still works */
      });
    return () => {
      mounted.current = false;
    };
  }, [commentId]);

  const toggle = useCallback(
    async (type: ReactionType): Promise<ToggleResult> => {
      if (pending.has(type)) return 'busy';
      const wasMine = mine.has(type);
      const apply = (on: boolean) => {
        setMine((prev) => {
          const next = new Set(prev);
          if (on) next.add(type);
          else next.delete(type);
          return next;
        });
        setCounts((prev) => ({ ...prev, [type]: Math.max(0, prev[type] + (on ? 1 : -1)) }));
      };

      apply(!wasMine); // optimistic
      setPending((prev) => new Set(prev).add(type));
      try {
        await toggleCommentReaction(commentId, type);
        return 'ok';
      } catch {
        if (mounted.current) apply(wasMine); // roll back
        return 'error';
      } finally {
        if (mounted.current) {
          setPending((prev) => {
            const next = new Set(prev);
            next.delete(type);
            return next;
          });
        }
      }
    },
    [commentId, mine, pending]
  );

  return { counts, mine, pending, toggle };
}
