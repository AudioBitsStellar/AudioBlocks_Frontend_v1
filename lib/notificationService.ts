import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

/** Types emitted by the backend Notification entity; unknown types render as `system`. */
export type NotificationType =
  'royalty_payout' | 'song_status' | 'marketplace_sale' | 'comment' | 'follow' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  notifications: AppNotification[];
  unreadCount: number;
  page: number;
  totalPages: number;
}

/** GET /api/notifications → `{ data, unreadCount, pagination }`. */
export async function listNotifications(page: number, limit: number): Promise<NotificationPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await apiClient.get(`${API_ENDPOINTS.NOTIFICATIONS}?${params}`);
  const body = res.data ?? {};

  return {
    notifications: Array.isArray(body.data) ? body.data : [],
    unreadCount: Number(body.unreadCount) || 0,
    page: Number(body.pagination?.page) || page,
    totalPages: Number(body.pagination?.totalPages) || 0,
  };
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiClient.put(API_ENDPOINTS.NOTIFICATION_READ(notificationId));
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post(API_ENDPOINTS.NOTIFICATIONS_READ_ALL);
}

function dataId(data: AppNotification['data'], key: string): string | null {
  const value = data?.[key];
  return typeof value === 'string' && value.length > 0 ? encodeURIComponent(value) : null;
}

/**
 * In-app route a notification points to, from the ids in its `data` payload
 * (playlist, song, or transaction), or `null` when it has no target.
 */
export function getNotificationHref(notification: AppNotification): string | null {
  const playlistId = dataId(notification.data, 'playlistId');
  if (playlistId) return `/dashboard/playlist/${playlistId}`;

  const songId = dataId(notification.data, 'songId');
  if (songId) return `/embed/song/${songId}`;

  if (dataId(notification.data, 'txHash')) return '/dashboard/transactions';

  return null;
}
