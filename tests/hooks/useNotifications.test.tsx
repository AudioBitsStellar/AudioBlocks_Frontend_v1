import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NOTIFICATION_QUERY_KEYS,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notificationService';
import type { AppNotification, NotificationPage } from '@/lib/notificationService';

vi.mock('@/lib/notificationService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notificationService')>();
  return {
    ...actual,
    listNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const unread: AppNotification = {
  id: 'n1',
  type: 'comment',
  title: 'New reply',
  message: 'Someone replied',
  data: { songId: 's1' },
  isRead: false,
  createdAt: '2026-10-19T12:00:00.000Z',
};
const read: AppNotification = { ...unread, id: 'n2', isRead: true };
const PANEL_KEY = NOTIFICATION_QUERY_KEYS.page(1, 10);
const FULL_KEY = NOTIFICATION_QUERY_KEYS.page(1, 20);

function createClient(pages: Array<[readonly unknown[], NotificationPage]> = []) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  pages.forEach(([key, page]) => client.setQueryData(key, page));
  // Keep the settle-time refetch from overwriting optimistic state with mocks.
  vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const page = (notifications: AppNotification[], unreadCount: number): NotificationPage => ({
  notifications,
  unreadCount,
  page: 1,
  totalPages: 1,
});

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the unread count reported by the backend', async () => {
    vi.mocked(listNotifications).mockResolvedValueOnce(page([unread, read], 7));
    const { wrapper } = createClient();

    const { result } = renderHook(() => useNotifications(1, 10), { wrapper });

    await waitFor(() => expect(result.current.data?.unreadCount).toBe(7));
    expect(listNotifications).toHaveBeenCalledWith(1, 10);
  });

  it('does not request notifications while disabled', () => {
    const { wrapper } = createClient();
    renderHook(() => useNotifications(1, 10, { enabled: false }), { wrapper });
    expect(listNotifications).not.toHaveBeenCalled();
  });
});

describe('useMarkNotificationRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates every cached page before the request resolves', async () => {
    let resolveRequest: () => void = () => {};
    vi.mocked(markNotificationRead).mockReturnValueOnce(
      new Promise<void>((resolve) => (resolveRequest = resolve))
    );
    const { client, wrapper } = createClient([
      [PANEL_KEY, page([unread, read], 2)],
      [FULL_KEY, page([unread, read], 2)],
    ]);
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });

    act(() => result.current.mutate(unread));

    await waitFor(() => {
      for (const key of [PANEL_KEY, FULL_KEY]) {
        const cached = client.getQueryData<NotificationPage>(key);
        expect(cached?.unreadCount).toBe(1);
        expect(cached?.notifications[0].isRead).toBe(true);
      }
    });
    expect(markNotificationRead).toHaveBeenCalledWith('n1');
    resolveRequest();
  });

  it('leaves the count unchanged for an already-read notification', async () => {
    vi.mocked(markNotificationRead).mockResolvedValueOnce(undefined);
    const { client, wrapper } = createClient([[PANEL_KEY, page([read], 2)]]);
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });

    act(() => result.current.mutate(read));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData<NotificationPage>(PANEL_KEY)?.unreadCount).toBe(2);
  });

  it('rolls back and reports an error when the request fails', async () => {
    vi.mocked(markNotificationRead).mockRejectedValueOnce(new Error('offline'));
    const { client, wrapper } = createClient([[PANEL_KEY, page([unread], 1)]]);
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });

    act(() => result.current.mutate(unread));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const cached = client.getQueryData<NotificationPage>(PANEL_KEY);
    expect(cached?.unreadCount).toBe(1);
    expect(cached?.notifications[0].isRead).toBe(false);
  });
});

describe('useMarkAllNotificationsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the unread count and marks every cached notification read', async () => {
    vi.mocked(markAllNotificationsRead).mockResolvedValueOnce(undefined);
    const { client, wrapper } = createClient([[PANEL_KEY, page([unread, read], 5)]]);
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper });

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cached = client.getQueryData<NotificationPage>(PANEL_KEY);
    expect(cached?.unreadCount).toBe(0);
    expect(cached?.notifications.every((item) => item.isRead)).toBe(true);
  });
});
