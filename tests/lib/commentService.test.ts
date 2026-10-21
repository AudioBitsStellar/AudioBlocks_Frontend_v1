import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/apiClient';
import {
  createComment,
  deleteComment,
  getCommentReplies,
  getSongComments,
  updateComment,
} from '@/lib/commentService';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const api = vi.mocked(apiClient);
const response = (data: unknown) => ({ data, status: 200, headers: new Headers() });

describe('commentService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads song comments and replies from the backend routes', async () => {
    api.get.mockResolvedValue(
      response({ comments: [], total: 0, page: 2, limit: 20, totalPages: 0 })
    );

    await expect(getSongComments('s1', 2, 20)).resolves.toEqual({
      comments: [],
      total: 0,
      page: 2,
      totalPages: 0,
    });
    await getCommentReplies('c1', 1, 20);

    expect(api.get).toHaveBeenNthCalledWith(1, '/api/song/s1/comments?page=2&limit=20');
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/comments/c1/replies?page=1&limit=20');
  });

  it('posts comments and replies, sending parentId only for replies', async () => {
    api.post.mockResolvedValue(response({ comment: { id: 'new' } }));

    await expect(createComment('s1', 'Hi')).resolves.toEqual({ id: 'new' });
    await createComment('s1', 'Re', 'c1');

    expect(api.post).toHaveBeenNthCalledWith(1, '/api/song/s1/comments', { text: 'Hi' });
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/song/s1/comments', {
      text: 'Re',
      parentId: 'c1',
    });
  });

  it('updates and deletes a comment by id', async () => {
    api.put.mockResolvedValue(response({ comment: { id: 'c1', text: 'Edited' } }));

    await expect(updateComment('c1', 'Edited')).resolves.toEqual({ id: 'c1', text: 'Edited' });
    await deleteComment('c1');

    expect(api.put).toHaveBeenCalledWith('/api/comments/c1', { text: 'Edited' });
    expect(api.delete).toHaveBeenCalledWith('/api/comments/c1');
  });
});
