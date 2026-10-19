import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMMENT_QUERY_KEYS,
  flattenComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '@/hooks/useSongComments';
import { createComment, deleteComment, updateComment } from '@/lib/commentService';
import type { CommentPages } from '@/hooks/useSongComments';
import type { SongComment } from '@/lib/commentService';

vi.mock('@/lib/commentService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/commentService')>();
  return {
    ...actual,
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
  };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const SONG = 'song-1';
const author = { id: 'u1', name: 'Ada' };

function comment(overrides: Partial<SongComment>): SongComment {
  return {
    id: 'c1',
    songId: SONG,
    userId: 'u1',
    text: 'Hello',
    parentId: null,
    depth: 1,
    edited: false,
    replyCount: 0,
    author,
    createdAt: '2026-10-19T12:00:00.000Z',
    updatedAt: '2026-10-19T12:00:00.000Z',
    ...overrides,
  };
}

const pages = (comments: SongComment[], page = 1, totalPages = 1): CommentPages => ({
  pages: [{ comments, total: comments.length, page, totalPages }],
  pageParams: [page],
});

function setup(seed: Array<[readonly unknown[], CommentPages]>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  seed.forEach(([key, data]) => client.setQueryData(key, data));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const topKey = COMMENT_QUERY_KEYS.top(SONG);
const read = (client: QueryClient, key: readonly unknown[]) =>
  flattenComments(client.getQueryData<CommentPages>(key));

describe('flattenComments', () => {
  it('drops duplicates that shifted across pages', () => {
    const a = comment({ id: 'a' });
    const b = comment({ id: 'b' });
    expect(
      flattenComments({
        pages: [
          { comments: [a, b], total: 3, page: 1, totalPages: 2 },
          { comments: [b], total: 3, page: 2, totalPages: 2 },
        ],
      }).map((c) => c.id)
    ).toEqual(['a', 'b']);
  });
});

describe('useCreateComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a top-level comment optimistically, then swaps in the server copy', async () => {
    let resolve: (value: SongComment) => void = () => {};
    vi.mocked(createComment).mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { client, wrapper } = setup([[topKey, pages([comment({ id: 'old' })])]]);
    const { result } = renderHook(() => useCreateComment(SONG), { wrapper });

    act(() => result.current.mutate({ text: 'New one', author }));

    await waitFor(() => expect(read(client, topKey)[0].text).toBe('New one'));
    expect(read(client, topKey)[0].id).toMatch(/^optimistic-/);
    expect(createComment).toHaveBeenCalledWith(SONG, 'New one', undefined);

    // The create response carries no author; the optimistic one is kept.
    act(() => resolve(comment({ id: 'server', text: 'New one', author: null })));
    await waitFor(() => expect(read(client, topKey)[0].id).toBe('server'));
    expect(read(client, topKey)[0].author).toEqual(author);
  });

  it('appends a reply to a fully loaded thread and bumps the parent reply count', async () => {
    vi.mocked(createComment).mockReturnValueOnce(new Promise(() => {}));
    const repliesKey = COMMENT_QUERY_KEYS.replies(SONG, 'p1');
    const { client, wrapper } = setup([
      [topKey, pages([comment({ id: 'p1', replyCount: 1 })])],
      [repliesKey, pages([comment({ id: 'r1', parentId: 'p1', depth: 2 })])],
    ]);
    const { result } = renderHook(() => useCreateComment(SONG), { wrapper });

    act(() => result.current.mutate({ text: 'Reply', parentId: 'p1', author }));

    await waitFor(() =>
      expect(read(client, repliesKey).map((c) => c.text)).toEqual(['Hello', 'Reply'])
    );
    expect(read(client, topKey)[0].replyCount).toBe(2);
    expect(createComment).toHaveBeenCalledWith(SONG, 'Reply', 'p1');
  });

  it('rolls back and shows an error when posting fails', async () => {
    vi.mocked(createComment).mockRejectedValueOnce(new Error('offline'));
    const { client, wrapper } = setup([[topKey, pages([comment({ id: 'old' })])]]);
    const { result } = renderHook(() => useCreateComment(SONG), { wrapper });

    act(() => result.current.mutate({ text: 'Lost', author }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(read(client, topKey).map((c) => c.id)).toEqual(['old']);
  });
});

describe('useUpdateComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the edited text and marker immediately', async () => {
    vi.mocked(updateComment).mockReturnValueOnce(new Promise(() => {}));
    const original = comment({});
    const { client, wrapper } = setup([[topKey, pages([original])]]);
    const { result } = renderHook(() => useUpdateComment(SONG), { wrapper });

    act(() => result.current.mutate({ comment: original, text: 'Changed' }));

    await waitFor(() =>
      expect(read(client, topKey)[0]).toMatchObject({ text: 'Changed', edited: true })
    );
    expect(updateComment).toHaveBeenCalledWith('c1', 'Changed');
  });
});

describe('useDeleteComment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes a reply and decrements its parent reply count', async () => {
    vi.mocked(deleteComment).mockResolvedValueOnce(undefined);
    const reply = comment({ id: 'r1', parentId: 'p1', depth: 2 });
    const repliesKey = COMMENT_QUERY_KEYS.replies(SONG, 'p1');
    const { client, wrapper } = setup([
      [topKey, pages([comment({ id: 'p1', replyCount: 1 })])],
      [repliesKey, pages([reply])],
    ]);
    const { result } = renderHook(() => useDeleteComment(SONG), { wrapper });

    act(() => result.current.mutate(reply));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(read(client, repliesKey)).toEqual([]);
    expect(read(client, topKey)[0].replyCount).toBe(0);
    expect(deleteComment).toHaveBeenCalledWith('r1');
  });
});
