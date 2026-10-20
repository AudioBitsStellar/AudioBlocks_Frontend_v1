import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '@/lib/apiClient';
import { ApiShapeError } from '@/lib/api/unwrap';
import {
  listSubscriptionGifts,
  searchUsersByUsername,
  sendSubscriptionGift,
} from '@/lib/giftService';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  apiErrorMessage: vi.fn(),
}));

const ok = (data: unknown) => ({ data, status: 200, headers: new Headers() });

describe('gift service (#585)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts a gift and drops a blank message', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce(ok({ gift: { id: 'g1', status: 'pending' } }));

    const gift = await sendSubscriptionGift({
      recipientId: 'u2',
      tier: 'artist_pro',
      message: '  ',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/subscriptions/gift', {
      recipientId: 'u2',
      tier: 'artist_pro',
      message: undefined,
    });
    expect(gift).toEqual({ id: 'g1', status: 'pending' });
  });

  it('lists sent and received gifts from the gifts envelope', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(ok({ gifts: [{ id: 'g1' }] }));

    await expect(listSubscriptionGifts()).resolves.toEqual([{ id: 'g1' }]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/subscriptions/gifts');
  });

  it('rejects an unexpected gifts response shape', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce(ok({ unexpected: true }));

    await expect(listSubscriptionGifts()).rejects.toBeInstanceOf(ApiShapeError);
  });

  it('filters users by username without fetching when the query is blank', async () => {
    await expect(searchUsersByUsername('   ')).resolves.toEqual([]);
    expect(apiClient.get).not.toHaveBeenCalled();

    vi.mocked(apiClient.get).mockResolvedValueOnce(
      ok([
        { id: 'u1', username: 'Ada' },
        { id: 'u2', username: 'bada' },
        { id: 'u3', username: 'grace' },
        { id: 'u4' },
      ])
    );

    await expect(searchUsersByUsername('ada')).resolves.toEqual([
      { id: 'u1', username: 'Ada' },
      { id: 'u2', username: 'bada' },
    ]);
  });
});
