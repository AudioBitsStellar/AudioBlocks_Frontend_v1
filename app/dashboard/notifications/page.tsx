'use client';

import { useState } from 'react';
import { NotificationList } from '@/components/notifications/NotificationList';
import { Pagination } from '@/components/ui/pagination';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import type { AppNotification } from '@/lib/notificationService';

const PAGE_SIZE = 20;

/** Full notification history with pagination (#574). */
export default function NotificationsPage() {
  const signedIn = useHasAuthSession();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useNotifications(page, PAGE_SIZE, {
    enabled: signedIn,
  });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleSelect = (notification: AppNotification) => {
    if (!notification.isRead) markRead.mutate(notification);
  };

  return (
    <section aria-labelledby="notifications-heading" className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-white" id="notifications-heading">
          Notifications
        </h1>
        {unreadCount > 0 && (
          <button
            className="text-sm text-[#F2AFC9] hover:underline disabled:opacity-50"
            disabled={markAll.isPending}
            type="button"
            onClick={() => markAll.mutate()}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="rounded-xl bg-[#1E1E1E] overflow-hidden">
        {!signedIn ? (
          <p className="p-6 text-sm text-gray-400">Log in to see your notifications.</p>
        ) : isLoading ? (
          <p className="p-6 text-sm text-gray-400">Loading notifications…</p>
        ) : isError ? (
          <div className="p-6 text-sm text-gray-400">
            Could not load notifications.{' '}
            <button
              className="text-[#F2AFC9] hover:underline"
              type="button"
              onClick={() => refetch()}
            >
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No notifications yet.</p>
        ) : (
          <NotificationList notifications={notifications} onSelect={handleSelect} />
        )}
      </div>

      {(data?.totalPages ?? 0) > 1 && (
        <Pagination
          className="mt-6"
          currentPage={page}
          totalPages={data?.totalPages}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
