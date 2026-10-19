import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Comment from '@/components/common/dashboard/Comment';
import {
  createComment,
  deleteComment,
  getCommentReplies,
  getSongComments,
} from '@/lib/commentService';
import type { SongComment } from '@/lib/commentService';

const auth = vi.hoisted(() => ({ signedIn: true }));

vi.mock('@/hooks/useHasAuthSession', () => ({ useHasAuthSession: () => auth.signedIn }));

vi.mock('@/hooks/useProfile', () => ({
  useGetProfile: () => ({ data: { id: 'me', name: 'Me' } }),
}));

vi.mock('@/lib/commentService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/commentService')>();
  return {
    ...actual,
    getSongComments: vi.fn(),
    getCommentReplies: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
  };
});

vi.mock('next/image', () => ({
  default: ({ alt, src }: React.ComponentProps<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, className }: React.ComponentProps<'a'>) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/common/ReportDialog', () => ({ ReportDialog: () => null }));

const SONG_ID = '3f1c2a4e-8b7d-4c1e-9a2b-5d6e7f8a9b0c';
const now = new Date().toISOString();
const base: SongComment = {
  id: 'c1',
  songId: SONG_ID,
  userId: 'other',
  text: 'Great track <script>alert(1)</script>',
  parentId: null,
  depth: 1,
  edited: false,
  replyCount: 1,
  author: { id: 'other', name: 'Bola' },
  createdAt: now,
  updatedAt: now,
};
const mine: SongComment = {
  ...base,
  id: 'c2',
  userId: 'me',
  text: 'My take',
  replyCount: 0,
  edited: true,
  author: { id: 'me', name: 'Me' },
};

function renderPanel(trackId = SONG_ID) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Comment trackId={trackId} onClose={() => {}} />
    </QueryClientProvider>
  );
}

describe('Comment panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.signedIn = true;
    vi.mocked(getSongComments).mockResolvedValue({
      comments: [base, mine],
      total: 2,
      page: 1,
      totalPages: 1,
    });
  });

  it('renders backend comments as sanitized text with the edited marker', async () => {
    renderPanel();

    expect(await screen.findByText('Great track')).toBeInTheDocument();
    expect(screen.queryByText(/alert/)).not.toBeInTheDocument();
    expect(screen.queryByText('Alexia Stephen')).not.toBeInTheDocument();
    expect(screen.getByText('(edited)')).toBeInTheDocument();
    expect(getSongComments).toHaveBeenCalledWith(SONG_ID, 1, 20);
  });

  it('does not request comments for local demo tracks the backend would reject', () => {
    renderPanel('track-1');

    expect(
      screen.getByText('Comments are available on songs published to AudioBlocks.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Write a comment' })).not.toBeInTheDocument();
    expect(getSongComments).not.toHaveBeenCalled();
  });

  it('asks logged-out listeners to log in instead of showing the composer', async () => {
    auth.signedIn = false;
    renderPanel();

    expect(await screen.findByRole('link', { name: 'Log in to comment' })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.queryByRole('textbox', { name: 'Write a comment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument();
  });

  it('posts a comment and shows it before the server responds', async () => {
    vi.mocked(createComment).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Great track');

    await user.type(screen.getByRole('textbox', { name: 'Write a comment' }), 'Fresh thoughts');
    await user.click(screen.getByRole('button', { name: 'Send comment' }));

    expect(await screen.findByText('Fresh thoughts')).toBeInTheDocument();
    expect(createComment).toHaveBeenCalledWith(SONG_ID, 'Fresh thoughts', undefined);
  });

  it('limits the composer to the backend character limit', async () => {
    renderPanel();
    expect(await screen.findByRole('textbox', { name: 'Write a comment' })).toHaveAttribute(
      'maxLength',
      '2000'
    );
  });

  it('loads replies and replies inline', async () => {
    vi.mocked(getCommentReplies).mockResolvedValue({
      comments: [
        { ...base, id: 'r1', parentId: 'c1', depth: 2, replyCount: 0, text: 'First reply' },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    vi.mocked(createComment).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: 'View 1 reply' }));
    expect(await screen.findByText('First reply')).toBeInTheDocument();
    expect(getCommentReplies).toHaveBeenCalledWith('c1', 1, 20);

    const [firstReply] = screen.getAllByRole('button', { name: 'Reply' });
    await user.click(firstReply);
    await user.type(screen.getByRole('textbox', { name: 'Reply to Bola' }), 'Agreed');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(createComment).toHaveBeenCalledWith(SONG_ID, 'Agreed', 'c1');
    expect(await screen.findByText('Agreed')).toBeInTheDocument();
  });

  it('deletes your own comment after confirmation', async () => {
    vi.mocked(deleteComment).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPanel();

    const item = (await screen.findByText('My take')).closest('li') as HTMLElement;
    expect(within(item).queryByRole('button', { name: /Report/ })).not.toBeInTheDocument();

    await user.click(within(item).getByRole('button', { name: 'Delete' }));
    expect(deleteComment).not.toHaveBeenCalled();
    await user.click(within(item).getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => expect(screen.queryByText('My take')).not.toBeInTheDocument());
    expect(deleteComment).toHaveBeenCalledWith('c2');
  });

  it('only offers edit and delete on your own comments', async () => {
    renderPanel();

    const other = (await screen.findByText('Great track')).closest('li') as HTMLElement;
    expect(within(other).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(other).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(
      within(other).getByRole('button', { name: /Report comment by Bola/ })
    ).toBeInTheDocument();
  });
});
