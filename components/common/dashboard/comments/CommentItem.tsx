'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { ArtworkImage } from '@/components/ui/ArtworkImage';
import {
  flattenComments,
  isOptimisticComment,
  useCommentReplies,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '@/hooks/useSongComments';
import { COMMENT_EDIT_WINDOW_MS, COMMENT_MAX_DEPTH } from '@/lib/commentService';
import { formatRelativeTime } from '@/lib/relativeTime';
import { sanitizeUserInput } from '@/lib/sanitize';
import { CommentComposer } from './CommentComposer';
import type { CommentAuthor, SongComment } from '@/lib/commentService';

export interface CommentViewer {
  /** Signed-in author, or `null` when logged out. */
  author: CommentAuthor | null;
  onReport: (commentId: string) => void;
}

interface CommentItemProps {
  comment: SongComment;
  viewer: CommentViewer;
}

const actionClass = 'text-xs text-[#AFB6B2] hover:text-white transition-colors';

/** One comment with reply, edit, delete and report actions, plus its lazily loaded replies (#576). */
export function CommentItem({ comment, viewer }: CommentItemProps) {
  const [mode, setMode] = useState<'idle' | 'replying' | 'editing' | 'confirmingDelete'>('idle');
  const [showReplies, setShowReplies] = useState(false);
  const createComment = useCreateComment(comment.songId);
  const updateComment = useUpdateComment(comment.songId);
  const deleteComment = useDeleteComment(comment.songId);

  const pending = isOptimisticComment(comment);
  const isOwn = !!viewer.author && viewer.author.id === comment.userId;
  const canEdit =
    isOwn && Date.now() - new Date(comment.createdAt).getTime() < COMMENT_EDIT_WINDOW_MS;
  const canReply = !!viewer.author && comment.depth < COMMENT_MAX_DEPTH;
  const authorName = comment.author?.name || comment.author?.username || 'Listener';

  return (
    <li aria-busy={pending} className="flex flex-col gap-2 border-b border-white/5 pb-3">
      <div className="flex items-center gap-2">
        <ArtworkImage
          alt={`${authorName}'s avatar`}
          className="rounded-full object-cover shrink-0"
          height={32}
          src={comment.author?.profileImage}
          title={authorName}
          width={32}
        />
        <h3 className="text-sm font-semibold text-white truncate">{authorName}</h3>
        <time className="text-xs text-[#AFB6B2] shrink-0" dateTime={comment.createdAt}>
          {formatRelativeTime(comment.createdAt)}
        </time>
        {comment.edited && <span className="text-[11px] text-[#AFB6B2]">(edited)</span>}
      </div>

      {mode === 'editing' ? (
        <CommentComposer
          autoFocus
          initialValue={comment.text}
          label="Edit comment"
          submitLabel="Save comment"
          onCancel={() => setMode('idle')}
          onSubmit={(text) => {
            updateComment.mutate({ comment, text });
            setMode('idle');
          }}
        />
      ) : (
        <p className="text-xs text-[#AFB6B2] whitespace-pre-wrap break-words">
          {sanitizeUserInput(comment.text)}
        </p>
      )}

      {!pending && mode !== 'editing' && (
        <div className="flex flex-wrap items-center gap-3">
          {canReply && (
            <button className={actionClass} type="button" onClick={() => setMode('replying')}>
              Reply
            </button>
          )}
          {canEdit && (
            <button className={actionClass} type="button" onClick={() => setMode('editing')}>
              Edit
            </button>
          )}
          {isOwn && (
            <button
              className={actionClass}
              type="button"
              onClick={() => setMode('confirmingDelete')}
            >
              Delete
            </button>
          )}
          {!isOwn && (
            <button
              aria-label={`Report comment by ${authorName}`}
              className={`flex items-center gap-1 ${actionClass} hover:text-red-400`}
              type="button"
              onClick={() => viewer.onReport(comment.id)}
            >
              <Flag size={12} />
              Report
            </button>
          )}
        </div>
      )}

      {mode === 'confirmingDelete' && (
        <div className="flex items-center gap-3 text-xs" role="alert">
          <span className="text-white">Delete this comment?</span>
          <button
            className="text-red-400 hover:text-red-300"
            type="button"
            onClick={() => {
              deleteComment.mutate(comment);
              setMode('idle');
            }}
          >
            Confirm delete
          </button>
          <button className={actionClass} type="button" onClick={() => setMode('idle')}>
            Cancel
          </button>
        </div>
      )}

      {mode === 'replying' && (
        <CommentComposer
          autoFocus
          label={`Reply to ${authorName}`}
          submitLabel="Send reply"
          onCancel={() => setMode('idle')}
          onSubmit={(text) => {
            createComment.mutate({ text, parentId: comment.id, author: viewer.author });
            setShowReplies(true);
            setMode('idle');
          }}
        />
      )}

      {comment.replyCount > 0 && (
        <button
          aria-expanded={showReplies}
          className={`self-start ${actionClass} text-[#F2AFC9]`}
          type="button"
          onClick={() => setShowReplies((open) => !open)}
        >
          {showReplies
            ? 'Hide replies'
            : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
        </button>
      )}

      {showReplies && <CommentReplies parent={comment} viewer={viewer} />}
    </li>
  );
}

function CommentReplies({ parent, viewer }: { parent: SongComment; viewer: CommentViewer }) {
  const replies = useCommentReplies(parent.songId, parent.id, true);
  const items = flattenComments(replies.data);

  if (replies.isLoading) return <p className="pl-6 text-xs text-[#AFB6B2]">Loading replies…</p>;
  if (replies.isError)
    return <p className="pl-6 text-xs text-[#AFB6B2]">Could not load replies.</p>;

  return (
    <div className="pl-6 border-l border-white/10">
      <ul className="flex flex-col gap-3">
        {items.map((reply) => (
          <CommentItem key={reply.id} comment={reply} viewer={viewer} />
        ))}
      </ul>
      {replies.hasNextPage && (
        <button
          className={`mt-2 ${actionClass}`}
          disabled={replies.isFetchingNextPage}
          type="button"
          onClick={() => replies.fetchNextPage()}
        >
          Load more replies
        </button>
      )}
    </div>
  );
}

export default CommentItem;
