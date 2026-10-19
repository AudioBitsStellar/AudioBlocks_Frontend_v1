'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createComment,
  deleteComment,
  getCommentReplies,
  getSongComments,
  isBackendSongId,
  updateComment,
} from '@/lib/commentService';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';
import type { CommentAuthor, CommentPage, SongComment } from '@/lib/commentService';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

export const COMMENT_PAGE_SIZE = 20;

export const COMMENT_QUERY_KEYS = {
  song: (songId: string) => ['song-comments', songId] as const,
  top: (songId: string) => ['song-comments', songId, 'top'] as const,
  replies: (songId: string, commentId: string) =>
    ['song-comments', songId, 'replies', commentId] as const,
};

export type CommentPages = InfiniteData<CommentPage, number>;

const getNextPageParam = (last: CommentPage) =>
  last.page < last.totalPages ? last.page + 1 : undefined;

/**
 * Flattens loaded pages, dropping duplicates that appear when an optimistic insert
 * shifts page offsets. O(n) in loaded comments.
 */
export function flattenComments(data: { pages: CommentPage[] } | undefined): SongComment[] {
  if (!data) return [];
  const seen = new Set<string>();
  const comments: SongComment[] = [];
  for (const page of data.pages) {
    for (const comment of page.comments) {
      if (seen.has(comment.id)) continue;
      seen.add(comment.id);
      comments.push(comment);
    }
  }
  return comments;
}

/** A song's top-level comments, paginated (#576). */
export function useSongComments(songId: string) {
  return useInfiniteQuery({
    queryKey: COMMENT_QUERY_KEYS.top(songId),
    queryFn: ({ pageParam }) => getSongComments(songId, pageParam, COMMENT_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam,
    // The backend rejects non-UUID song ids, so local demo tracks are never requested.
    enabled: isBackendSongId(songId),
    staleTime: CACHE_DURATIONS.SHORT,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

/** Direct replies to a comment, loaded only once the thread is expanded. */
export function useCommentReplies(songId: string, commentId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: COMMENT_QUERY_KEYS.replies(songId, commentId),
    queryFn: ({ pageParam }) => getCommentReplies(commentId, pageParam, COMMENT_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam,
    enabled,
    staleTime: CACHE_DURATIONS.SHORT,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

type CommentsUpdater = (comments: SongComment[]) => SongComment[];

/** Applies `update` to every cached thread of a song. O(n) in cached comments. */
function updateAllThreads(client: QueryClient, songId: string, update: CommentsUpdater) {
  client.setQueriesData<CommentPages>({ queryKey: COMMENT_QUERY_KEYS.song(songId) }, (data) =>
    data
      ? { ...data, pages: data.pages.map((page) => ({ ...page, comments: update(page.comments) })) }
      : data
  );
}

const replaceComment =
  (id: string, next: SongComment): CommentsUpdater =>
  (comments) =>
    comments.map((comment) => (comment.id === id ? next : comment));

const adjustReplyCount =
  (id: string, delta: number): CommentsUpdater =>
  (comments) =>
    comments.map((comment) =>
      comment.id === id
        ? { ...comment, replyCount: Math.max(0, comment.replyCount + delta) }
        : comment
    );

interface CommentMutationConfig<TVariables, TResult, TContext> {
  mutationFn: (variables: TVariables) => Promise<TResult>;
  /** Optimistic cache change; its return value is passed to `reconcile`. */
  apply: (client: QueryClient, variables: TVariables) => TContext;
  /** Replaces optimistic state with the server result. */
  reconcile?: (
    client: QueryClient,
    result: TResult,
    variables: TVariables,
    context: TContext
  ) => void;
  errorMessage: string;
}

/** Shared optimistic flow: snapshot every thread, apply, roll back on error. */
function useCommentMutation<TVariables, TResult, TContext = void>(
  songId: string,
  {
    mutationFn,
    apply,
    reconcile,
    errorMessage,
  }: CommentMutationConfig<TVariables, TResult, TContext>
) {
  const client = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      const queryKey = COMMENT_QUERY_KEYS.song(songId);
      await client.cancelQueries({ queryKey });
      const snapshot = client.getQueriesData<CommentPages>({ queryKey });
      return { snapshot, value: apply(client, variables) };
    },
    onSuccess: (result, variables, context) => {
      if (context) reconcile?.(client, result, variables, context.value);
    },
    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
      toast.error(errorMessage);
    },
  });
}

export interface CreateCommentVariables {
  text: string;
  parentId?: string | null;
  /** Signed-in author, shown on the optimistic comment until the server responds. */
  author: CommentAuthor | null;
}

const OPTIMISTIC_PREFIX = 'optimistic-';
let optimisticSequence = 0;

/** True while a posted comment is still waiting for the server's copy. */
export const isOptimisticComment = (comment: SongComment) =>
  comment.id.startsWith(OPTIMISTIC_PREFIX);

/**
 * Posts a comment or reply. It appears immediately: top-level comments at the top
 * of the first page, replies at the end of a fully loaded thread.
 */
export function useCreateComment(songId: string) {
  return useCommentMutation(songId, {
    mutationFn: ({ text, parentId }: CreateCommentVariables) =>
      createComment(songId, text, parentId),
    apply: (client, { text, parentId, author }) => {
      const now = new Date().toISOString();
      const optimistic: SongComment = {
        id: `${OPTIMISTIC_PREFIX}${++optimisticSequence}`,
        songId,
        userId: author?.id ?? '',
        text,
        parentId: parentId ?? null,
        // Replaced by the server's view on success; actions stay disabled until then.
        depth: 1,
        edited: false,
        replyCount: 0,
        author,
        createdAt: now,
        updatedAt: now,
      };

      if (parentId) {
        updateAllThreads(client, songId, adjustReplyCount(parentId, 1));
        client.setQueryData<CommentPages>(COMMENT_QUERY_KEYS.replies(songId, parentId), (data) => {
          const last = data?.pages[data.pages.length - 1];
          // Unloaded later pages will bring the reply in order; appending would duplicate it.
          if (!data || !last || last.page < last.totalPages) return data;
          const pages = [...data.pages];
          pages[pages.length - 1] = { ...last, comments: [...last.comments, optimistic] };
          return { ...data, pages };
        });
      } else {
        client.setQueryData<CommentPages>(COMMENT_QUERY_KEYS.top(songId), (data) => {
          if (!data || data.pages.length === 0) return data;
          const [first, ...rest] = data.pages;
          return {
            ...data,
            pages: [
              { ...first, total: first.total + 1, comments: [optimistic, ...first.comments] },
              ...rest,
            ],
          };
        });
      }
      return optimistic.id;
    },
    // The create response is built without the user relation, so keep the known author.
    reconcile: (client, saved, { author }, optimisticId) =>
      updateAllThreads(
        client,
        songId,
        replaceComment(optimisticId, { ...saved, author: saved.author ?? author })
      ),
    errorMessage: 'Could not post your comment. Please try again.',
  });
}

/** Edits the caller's comment; the new text and "edited" marker show immediately. */
export function useUpdateComment(songId: string) {
  return useCommentMutation(songId, {
    mutationFn: ({ comment, text }: { comment: SongComment; text: string }) =>
      updateComment(comment.id, text),
    apply: (client, { comment, text }) =>
      updateAllThreads(
        client,
        songId,
        replaceComment(comment.id, { ...comment, text, edited: true })
      ),
    reconcile: (client, saved, { comment }) =>
      updateAllThreads(client, songId, replaceComment(comment.id, saved)),
    errorMessage: 'Could not update your comment. Please try again.',
  });
}

/** Deletes the caller's comment (replies cascade on the backend). */
export function useDeleteComment(songId: string) {
  return useCommentMutation(songId, {
    mutationFn: (comment: SongComment) => deleteComment(comment.id),
    apply: (client, comment) => {
      updateAllThreads(client, songId, (comments) =>
        comments.filter((item) => item.id !== comment.id)
      );
      if (comment.parentId)
        updateAllThreads(client, songId, adjustReplyCount(comment.parentId, -1));
    },
    reconcile: (client, _result, comment) =>
      client.removeQueries({ queryKey: COMMENT_QUERY_KEYS.replies(songId, comment.id) }),
    errorMessage: 'Could not delete your comment. Please try again.',
  });
}
