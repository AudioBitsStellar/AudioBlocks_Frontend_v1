'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RETRY_CONFIG } from '@/lib/constants';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notificationService';
import type { AppNotification, NotificationPage } from '@/lib/notificationService';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

/** Unread badge refresh interval (#574). */
export const NOTIFICATION_POLL_MS = 60_000;

export const NOTIFICATION_QUERY_KEYS = {
  all: ['notifications'] as const,
  page: (page: number, limit: number) => ['notifications', page, limit] as const,
};

interface UseNotificationsOptions {
  /** Pass `false` while signed out; the endpoint requires auth. */
  enabled?: boolean;
}

/**
 * One page of the caller's notifications plus the global unread count, polled
 * every {@link NOTIFICATION_POLL_MS} while the tab is visible.
 */
export function useNotifications(
  page: number,
  limit: number,
  { enabled = true }: UseNotificationsOptions = {}
) {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.page(page, limit),
    queryFn: () => listNotifications(page, limit),
    enabled,
    refetchInterval: NOTIFICATION_POLL_MS,
    staleTime: NOTIFICATION_POLL_MS / 2,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

type Snapshot = Array<[QueryKey, NotificationPage | undefined]>;

/**
 * Applies `update` to every cached notification page (badge, panel and full page
 * share the unread count), returning a snapshot for rollback. O(P · L) for P cached
 * pages of L items.
 */
async function updateCachedPages(
  queryClient: QueryClient,
  update: (page: NotificationPage) => NotificationPage
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
  const snapshot = queryClient.getQueriesData<NotificationPage>({
    queryKey: NOTIFICATION_QUERY_KEYS.all,
  });
  queryClient.setQueriesData<NotificationPage>({ queryKey: NOTIFICATION_QUERY_KEYS.all }, (page) =>
    page ? update(page) : page
  );
  return snapshot;
}

function useOptimisticNotificationMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<void>,
  update: (page: NotificationPage, variables: TVariables) => NotificationPage,
  errorMessage: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => ({
      snapshot: await updateCachedPages(queryClient, (page) => update(page, variables)),
    }),
    onError: (_error, _variables, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(errorMessage);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
    },
  });
}

/** Marks one notification read; the badge drops before the request resolves. */
export function useMarkNotificationRead() {
  return useOptimisticNotificationMutation(
    (notification: AppNotification) => markNotificationRead(notification.id),
    (page, notification) =>
      notification.isRead
        ? page
        : {
            ...page,
            unreadCount: Math.max(0, page.unreadCount - 1),
            notifications: page.notifications.map((item) =>
              item.id === notification.id ? { ...item, isRead: true } : item
            ),
          },
    'Could not mark the notification as read.'
  );
}

/** Marks every notification read; the badge clears before the request resolves. */
export function useMarkAllNotificationsRead() {
  return useOptimisticNotificationMutation<void>(
    () => markAllNotificationsRead(),
    (page) => ({
      ...page,
      unreadCount: 0,
      notifications: page.notifications.map((item) =>
        item.isRead ? item : { ...item, isRead: true }
      ),
    }),
    'Could not mark notifications as read.'
  );
}
