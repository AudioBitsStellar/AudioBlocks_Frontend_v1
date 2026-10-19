import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

/** Mirrors backend `COMMENT_MAX_LENGTH` (CreateCommentDTO / UpdateCommentDTO). */
export const COMMENT_MAX_LENGTH = 2000;
/** Mirrors backend `COMMENT_MAX_DEPTH`: a top-level comment plus two reply levels. */
export const COMMENT_MAX_DEPTH = 3;
/** Mirrors backend `COMMENT_EDIT_WINDOW_MINUTES`. */
export const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000;

// Mirrors backend REGEX_PATTERNS.UUID, which CommentService enforces on song ids.
const SONG_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True for ids of songs stored on the backend; local demo tracks (e.g. `track-1`) are not. */
export function isBackendSongId(songId: string): boolean {
  return SONG_ID_PATTERN.test(songId);
}

export interface CommentAuthor {
  id: string;
  username?: string;
  name?: string;
  profileImage?: string;
}

/** Backend `CommentView`. */
export interface SongComment {
  id: string;
  songId: string;
  userId: string;
  text: string;
  parentId: string | null;
  depth: number;
  edited: boolean;
  replyCount: number;
  author: CommentAuthor | null;
  createdAt: string;
  updatedAt: string;
}

/** Backend `PaginatedComments`. */
export interface CommentPage {
  comments: SongComment[];
  total: number;
  page: number;
  totalPages: number;
}

function toPage(body: Partial<CommentPage> | null, page: number): CommentPage {
  return {
    comments: Array.isArray(body?.comments) ? body.comments : [],
    total: Number(body?.total) || 0,
    page: Number(body?.page) || page,
    totalPages: Number(body?.totalPages) || 0,
  };
}

function withPage(path: string, page: number, limit: number): string {
  return `${path}?${new URLSearchParams({ page: String(page), limit: String(limit) })}`;
}

/** Top-level comments, newest first. */
export async function getSongComments(songId: string, page: number, limit: number) {
  const res = await apiClient.get(withPage(API_ENDPOINTS.SONG_COMMENTS(songId), page, limit));
  return toPage(res.data, page);
}

/** Direct replies to a comment, oldest first. */
export async function getCommentReplies(commentId: string, page: number, limit: number) {
  const res = await apiClient.get(withPage(API_ENDPOINTS.COMMENT_REPLIES(commentId), page, limit));
  return toPage(res.data, page);
}

/** Posts a comment, or a reply when `parentId` is given. */
export async function createComment(
  songId: string,
  text: string,
  parentId?: string | null
): Promise<SongComment> {
  const res = await apiClient.post(API_ENDPOINTS.SONG_COMMENTS(songId), {
    text,
    ...(parentId ? { parentId } : {}),
  });
  return res.data.comment;
}

export async function updateComment(commentId: string, text: string): Promise<SongComment> {
  const res = await apiClient.put(API_ENDPOINTS.COMMENT(commentId), { text });
  return res.data.comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.COMMENT(commentId));
}
