import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/apiClient';
import {
  getNotificationHref,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notificationService';
import type { AppNotification } from '@/lib/notificationService';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

const mockApi = vi.mocked(apiClient);

function notification(data: AppNotification['data']): AppNotification {
  return {
    id: 'n1',
    type: 'system',
    title: 'Title',
    message: 'Message',
    data,
    isRead: false,
    createdAt: '2026-10-19T12:00:00.000Z',
  };
}

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests a page and normalizes the backend list response', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [notification(null)],
        unreadCount: 3,
        pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
      },
      status: 200,
      headers: new Headers(),
    });

    const page = await listNotifications(2, 20);

    expect(mockApi.get).toHaveBeenCalledWith('/api/notifications?page=2&limit=20');
    expect(page).toEqual({
      notifications: [notification(null)],
      unreadCount: 3,
      page: 2,
      totalPages: 2,
    });
  });

  it('falls back to an empty page when the body is missing', async () => {
    mockApi.get.mockResolvedValueOnce({ data: null, status: 200, headers: new Headers() });

    await expect(listNotifications(1, 10)).resolves.toEqual({
      notifications: [],
      unreadCount: 0,
      page: 1,
      totalPages: 0,
    });
  });

  it('marks one and all notifications as read on the backend routes', async () => {
    await markNotificationRead('abc');
    await markAllNotificationsRead();

    expect(mockApi.put).toHaveBeenCalledWith('/api/notifications/abc/read');
    expect(mockApi.post).toHaveBeenCalledWith('/api/notifications/read-all');
  });
});

describe('getNotificationHref', () => {
  it('deep-links playlists, songs and transactions', () => {
    expect(getNotificationHref(notification({ playlistId: 'p1' }))).toBe('/dashboard/playlist/p1');
    expect(getNotificationHref(notification({ songId: 's1' }))).toBe('/embed/song/s1');
    expect(getNotificationHref(notification({ txHash: 'abc123' }))).toBe('/dashboard/transactions');
  });

  it('encodes ids and ignores non-string values', () => {
    expect(getNotificationHref(notification({ songId: 'a/b' }))).toBe('/embed/song/a%2Fb');
    expect(getNotificationHref(notification({ songId: 42 }))).toBeNull();
    expect(getNotificationHref(notification(null))).toBeNull();
  });
});
