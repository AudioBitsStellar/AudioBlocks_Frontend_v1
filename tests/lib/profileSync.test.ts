import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/apiClient';
import { AUTH_SYNC_ENDPOINT, syncPrivyUserWithBackend } from '@/lib/profileSync';

vi.mock('@/lib/apiClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

describe('syncPrivyUserWithBackend (#477)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the provider user state to the sync endpoint', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { ok: true } } as never);

    const result = await syncPrivyUserWithBackend({
      walletAddress: '0x742d35cc6634c0532925a3b844bc9e7595f2bd38',
      email: 'test@example.com',
      dynamicUserId: 'user-1',
      role: 'listener',
    });

    expect(result).toBe(true);
    expect(mockApiClient.post).toHaveBeenCalledWith(AUTH_SYNC_ENDPOINT, {
      walletAddress: '0x742d35cc6634c0532925a3b844bc9e7595f2bd38',
      email: 'test@example.com',
      dynamicUserId: 'user-1',
      role: 'listener',
    });
  });

  it('resolves false instead of throwing when the backend rejects the sync', async () => {
    mockApiClient.post.mockRejectedValueOnce({ response: { status: 500 } });

    const result = await syncPrivyUserWithBackend({
      walletAddress: '0xabc',
    });

    expect(result).toBe(false);
  });

  it('resolves false on network failure so login is never disrupted', async () => {
    mockApiClient.post.mockRejectedValueOnce(new Error('network down'));

    await expect(
      syncPrivyUserWithBackend({
        walletAddress: '0xabc',
        email: null,
        dynamicUserId: null,
        role: null,
      })
    ).resolves.toBe(false);
  });
});
