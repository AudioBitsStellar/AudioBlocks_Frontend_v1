import Cookies from 'js-cookie';
import apiClient from './apiClient';
import { API_ENDPOINTS, AUTH } from './constants';

/** Mirrors the backend `ReactionType` enum (`src/entities/CommentReaction.ts`). */
export const REACTION_TYPES = ['like', 'heart', 'fire'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_META: Record<ReactionType, { emoji: string; label: string }> = {
  like: { emoji: '👍', label: 'Like' },
  heart: { emoji: '❤️', label: 'Heart' },
  fire: { emoji: '🔥', label: 'Fire' },
};

export interface ReactionSummary {
  type: ReactionType;
  count: number;
  users: { id: string; reactedAt?: string }[];
}

/**
 * Lists a comment's reactions grouped by type (public endpoint).
 * GET /api/comments/:id/reactions → `{ reactions: ReactionSummary[] }`
 */
export async function fetchCommentReactions(
  commentId: string | number
): Promise<ReactionSummary[]> {
  const { data } = await apiClient.get(API_ENDPOINTS.COMMENT_REACTIONS(commentId));
  const reactions = (data as { reactions?: ReactionSummary[] } | null)?.reactions;
  return Array.isArray(reactions) ? reactions : [];
}

/**
 * Toggles the signed-in user's reaction of `type` on a comment: adds it if
 * absent, removes it if present. Requires an authenticated session.
 */
export async function toggleCommentReaction(
  commentId: string | number,
  type: ReactionType
): Promise<{ added?: boolean; removed?: boolean }> {
  const { data } = await apiClient.post(API_ENDPOINTS.COMMENT_REACTIONS(commentId), { type });
  return (data ?? {}) as { added?: boolean; removed?: boolean };
}

/**
 * Id of the signed-in user, read from the `id` claim of the AudioBlocks JWT
 * (the same claim the API's `requireAuth` uses). Not verified — only used to
 * highlight the user's own reactions; the API decides what is allowed.
 */
export function getCurrentUserId(): string | null {
  if (typeof document === 'undefined') return null;
  const token = Cookies.get(AUTH.COOKIE_NAME);
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const { id } = JSON.parse(atob(padded)) as { id?: unknown };
    return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
  } catch {
    return null;
  }
}
