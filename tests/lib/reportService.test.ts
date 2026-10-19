import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '@/lib/apiClient';
import { submitReport } from '@/lib/reportService';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockPost = vi.mocked(apiClient.post);

describe('reportService.submitReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: {}, status: 201, headers: new Headers() });
  });

  it('posts song reports to the song report route', async () => {
    await submitReport({ kind: 'song', id: 'song-9' }, 'copyright');

    expect(mockPost).toHaveBeenCalledWith('/api/song/song-9/report', { reason: 'copyright' });
  });

  it('posts comment reports to the comment report route', async () => {
    await submitReport({ kind: 'comment', id: 42 }, 'spam');

    expect(mockPost).toHaveBeenCalledWith('/api/comments/42/report', { reason: 'spam' });
  });

  it('trims the description and includes it when present', async () => {
    await submitReport({ kind: 'song', id: 'song-9' }, 'other', '  looks wrong  ');

    expect(mockPost).toHaveBeenCalledWith('/api/song/song-9/report', {
      reason: 'other',
      description: 'looks wrong',
    });
  });

  it('omits a blank description', async () => {
    await submitReport({ kind: 'comment', id: 1 }, 'harassment', '   ');

    expect(mockPost).toHaveBeenCalledWith('/api/comments/1/report', { reason: 'harassment' });
  });

  it('propagates API errors so the caller can handle duplicates', async () => {
    const duplicate = Object.assign(new Error('HTTP error! status: 409'), { status: 409 });
    mockPost.mockRejectedValueOnce(duplicate);

    await expect(submitReport({ kind: 'song', id: 'song-9' }, 'spam')).rejects.toBe(duplicate);
  });
});
