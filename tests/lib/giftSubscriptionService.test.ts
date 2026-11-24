import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/apiClient';
import {
  listGiftSubscriptions,
  listGiftTiers,
  respondToGift,
  searchGiftArtists,
  sendGiftSubscription,
} from '@/lib/giftSubscriptionService';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockApi = vi.mocked(apiClient);

describe('giftSubscriptionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads gift lists and the active configured plans', async () => {
    const gift = { id: 'g1', status: 'pending' };
    mockApi.get
      .mockResolvedValueOnce({ data: { gifts: [gift] }, status: 200, headers: new Headers() })
      .mockResolvedValueOnce({
        data: {
          tiers: [
            { tier: 'artist_pro', displayName: 'Artist Pro' },
            { tier: 'hidden', hidden: true },
          ],
        },
        status: 200,
        headers: new Headers(),
      });

    await expect(listGiftSubscriptions()).resolves.toEqual([gift]);
    await expect(listGiftTiers()).resolves.toEqual([
      { tier: 'artist_pro', displayName: 'Artist Pro' },
    ]);
    expect(mockApi.get).toHaveBeenNthCalledWith(1, '/api/subscriptions/gifts');
    expect(mockApi.get).toHaveBeenNthCalledWith(2, '/api/subscriptions/tiers');
  });

  it('searches the public artist directory and posts a gift using the backend contract', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: [{ id: 'artist-1', username: 'ada' }],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
      status: 200,
      headers: new Headers(),
    });
    mockApi.post.mockResolvedValueOnce({
      data: { gift: { id: 'gift-1' } },
      status: 201,
      headers: new Headers(),
    });

    await expect(searchGiftArtists()).resolves.toEqual([{ id: 'artist-1', username: 'ada' }]);
    await expect(
      sendGiftSubscription({ recipientId: 'artist-1', tier: 'artist_pro', message: 'Thanks!' })
    ).resolves.toEqual({ id: 'gift-1' });
    expect(mockApi.get).toHaveBeenCalledWith('/api/artist?page=1&limit=100');
    expect(mockApi.post).toHaveBeenCalledWith('/api/subscriptions/gift', {
      recipientId: 'artist-1',
      tier: 'artist_pro',
      message: 'Thanks!',
    });
  });

  it('posts accept and decline responses to the gift action routes', async () => {
    await respondToGift('gift/1', 'accept');
    await respondToGift('gift-2', 'decline');
    expect(mockApi.post).toHaveBeenNthCalledWith(1, '/api/subscriptions/gift/gift%2F1/accept');
    expect(mockApi.post).toHaveBeenNthCalledWith(2, '/api/subscriptions/gift/gift-2/decline');
  });
});
