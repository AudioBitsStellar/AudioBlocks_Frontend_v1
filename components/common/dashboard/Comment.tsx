'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ReportDialog } from '@/components/common/ReportDialog';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import { useGetProfile } from '@/hooks/useProfile';
import { flattenComments, useCreateComment, useSongComments } from '@/hooks/useSongComments';
import { isBackendSongId } from '@/lib/commentService';
import { CommentComposer } from './comments/CommentComposer';
import { CommentItem, type CommentViewer } from './comments/CommentItem';
import type { CommentAuthor } from '@/lib/commentService';

interface CommentPanelProps {
  onClose: () => void;
  trackId: string;
}

const Comment = ({ onClose, trackId }: CommentPanelProps) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [reportedComment, setReportedComment] = useState<{ id: string } | null>(null);
  const signedIn = useHasAuthSession();
  const profile = useGetProfile();
  const comments = useSongComments(trackId);
  const createComment = useCreateComment(trackId);
  const commentable = isBackendSongId(trackId);
  // Clicks inside the report dialog are outside this panel, so the outside-click
  // handler must ignore them while the dialog is open.
  const isReportingRef = useRef(false);
  // Same for the login prompt a signed-out user gets when reacting (#577).
  const isAuthPromptOpenRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isReportingRef.current || isAuthPromptOpenRef.current) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = menuRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  const openReport = (commentId: string) => {
    isReportingRef.current = true;
    setReportedComment({ id: commentId });
  };

  const closeReport = () => {
    isReportingRef.current = false;
    setReportedComment(null);
  };

  const author: CommentAuthor | null =
    signedIn && profile.data
      ? {
          id: profile.data.id,
          name: profile.data.name,
          username: profile.data.username,
          profileImage: profile.data.profileImage,
        }
      : null;
  const viewer: CommentViewer = { author, onReport: openReport };
  const items = useMemo(() => flattenComments(comments.data), [comments.data]);

  return (
    <>
      <motion.div
        ref={menuRef}
        animate={{ y: 0, opacity: 1 }}
        aria-label="Comments"
        aria-modal="true"
        className="fixed bottom-0 pb-20 right-0 bg-[#1e1e1e] w-80 max-w-sm h-[90vh] p-4 z-50 flex flex-col"
        exit={{ y: 300, opacity: 0 }}
        initial={{ y: 300, opacity: 0 }}
        role="dialog"
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center border-b pb-3 justify-between mb-4">
          <h2 className="text-muted text-lg font-bold">Comments</h2>
          <button
            ref={closeButtonRef}
            aria-label="Close comments"
            className="text-muted cursor-pointer hover:text-red-400"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {!commentable ? (
            <p className="text-xs text-[#AFB6B2]">
              Comments are available on songs published to AudioBlocks.
            </p>
          ) : comments.isLoading ? (
            <p className="text-xs text-[#AFB6B2]">Loading comments…</p>
          ) : comments.isError ? (
            <p className="text-xs text-[#AFB6B2]">Could not load comments.</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-[#AFB6B2]">No comments yet. Start the conversation.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((comment) => (
                <CommentItem key={comment.id} comment={comment} viewer={viewer} />
              ))}
            </ul>
          )}
          {comments.hasNextPage && (
            <button
              className="mt-3 text-xs text-[#F2AFC9] hover:underline"
              disabled={comments.isFetchingNextPage}
              type="button"
              onClick={() => comments.fetchNextPage()}
            >
              Load more comments
            </button>
          )}
        </div>

        <div className="mt-4">
          {!commentable ? null : signedIn ? (
            <CommentComposer
              label="Write a comment"
              onSubmit={(text) => createComment.mutate({ text, author })}
            />
          ) : (
            <Link
              className="block text-center text-sm text-[#F2AFC9] hover:underline"
              href="/login"
            >
              Log in to comment
            </Link>
          )}
        </div>
      </motion.div>

      {reportedComment && (
        <ReportDialog
          open
          target={{ kind: 'comment', id: reportedComment.id }}
          onClose={closeReport}
        />
      )}
    </>
  );
};

export default Comment;
