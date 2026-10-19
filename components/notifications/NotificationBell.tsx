'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAnnounce } from '@/hooks/useAnnounce';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { NotificationList } from './NotificationList';
import type { AppNotification } from '@/lib/notificationService';

/** Recent notifications shown in the panel; the full list lives at /dashboard/notifications. */
export const PANEL_LIMIT = 10;
const BADGE_MAX = 99;

function unreadLabel(count: number): string {
  return count === 1 ? '1 unread notification' : `${count} unread notifications`;
}

/** Top-navbar bell with a polled unread badge and a slide-over panel (#574). */
export function NotificationBell() {
  const signedIn = useHasAuthSession();
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useNotifications(1, PANEL_LIMIT, { enabled: signedIn });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const announce = useAnnounce();

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  // Announce only increases (new notifications), not the initial load or reads.
  const previousUnread = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    if (previousUnread.current !== null && unreadCount > previousUnread.current) {
      announce(`You have ${unreadLabel(unreadCount)}`);
    }
    previousUnread.current = unreadCount;
  }, [data, unreadCount, announce]);

  const handleSelect = (notification: AppNotification) => {
    if (!notification.isRead) markRead.mutate(notification);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadLabel(unreadCount)}` : 'Notifications'
          }
          className="relative w-11 h-11 flex items-center justify-center"
          type="button"
        >
          <Bell className="text-white" size={20} />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] font-semibold leading-4 text-white text-center"
            >
              {unreadCount > BADGE_MAX ? `${BADGE_MAX}+` : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent className="bg-[#161616] text-white border-white/10 w-full sm:max-w-sm gap-0">
        <SheetHeader className="border-b border-white/10 pr-12">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-white">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <button
                className="text-xs text-[#F2AFC9] hover:underline disabled:opacity-50"
                disabled={markAll.isPending}
                type="button"
                onClick={() => markAll.mutate()}
              >
                Mark all as read
              </button>
            )}
          </div>
          <SheetDescription className="text-gray-400">
            {unreadCount > 0 ? unreadLabel(unreadCount) : 'You are all caught up'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {!signedIn ? (
            <p className="p-4 text-sm text-gray-400">Log in to see your notifications.</p>
          ) : isLoading ? (
            <p className="p-4 text-sm text-gray-400">Loading notifications…</p>
          ) : isError ? (
            <p className="p-4 text-sm text-gray-400">Could not load notifications.</p>
          ) : notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No notifications yet.</p>
          ) : (
            <NotificationList notifications={notifications} onSelect={handleSelect} />
          )}
        </div>

        <Link
          className="border-t border-white/10 p-4 text-center text-sm text-[#F2AFC9] hover:underline"
          href="/dashboard/notifications"
          onClick={() => setOpen(false)}
        >
          View all notifications
        </Link>
      </SheetContent>
    </Sheet>
  );
}

export default NotificationBell;
