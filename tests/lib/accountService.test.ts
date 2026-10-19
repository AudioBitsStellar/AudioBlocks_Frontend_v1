import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient, { NotFoundError } from '@/lib/apiClient';
import {
  ACCOUNT_DELETION_CONFIRMATION_PHRASE,
  getAccountDeletionStatus,
  requestAccountDeletion,
} from '@/lib/accountService';
import { API_ENDPOINTS } from '@/lib/constants';

vi.mock('@/lib/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/apiClient')>();
  return {
    ...actual,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  };
});

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

describe('accountService (#598)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads a scheduled deletion date from the status response', async () => {
    mockGet.mockResolvedValue({
      data: { scheduledFor: '2026-11-01T00:00:00.000Z' },
      status: 200,
      headers: new Headers(),
    });

    await expect(getAccountDeletionStatus()).resolves.toEqual({
      scheduledFor: '2026-11-01T00:00:00.000Z',
    });
    expect(mockGet).toHaveBeenCalledWith(API_ENDPOINTS.ACCOUNT_DELETION);
  });

  it('treats a 404 status as nothing scheduled', async () => {
    mockGet.mockRejectedValue(new NotFoundError());

    await expect(getAccountDeletionStatus()).resolves.toEqual({ scheduledFor: null });
  });

  it('sends the typed confirmation phrase when requesting deletion', async () => {
    mockPost.mockResolvedValue({
      data: { deletion: { scheduledFor: '2026-11-01T00:00:00.000Z' } },
      status: 200,
      headers: new Headers(),
    });

    await expect(requestAccountDeletion()).resolves.toEqual({
      scheduledFor: '2026-11-01T00:00:00.000Z',
    });
    expect(mockPost).toHaveBeenCalledWith(API_ENDPOINTS.ACCOUNT_DELETION, {
      confirmation: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    });
  });
});
