'use client';

import Link from 'next/link';
import {
  Bell,
  Coins,
  MessageCircle,
  Music,
  ShoppingBag,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { getNotificationHref } from '@/lib/notificationService';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { AppNotification } from '@/lib/notificationService';

const TYPE_ICONS: Record<string, LucideIcon> = {
  royalty_payout: Coins,
  song_status: Music,
  marketplace_sale: ShoppingBag,
  comment: MessageCircle,
  follow: UserPlus,
  system: Bell,
};

interface NotificationListProps {
  notifications: AppNotification[];
  /** Called on activation, before navigation to the notification's deep link. */
  onSelect: (notification: AppNotification) => void;
}

/** Notification rows: type icon, title, message, relative time and unread styling (#574). */
export function NotificationList({ notifications, onSelect }: NotificationListProps) {
  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {notifications.map((notification) => {
        const Icon = TYPE_ICONS[notification.type] ?? Bell;
        const href = getNotificationHref(notification);
        const content = (
          <>
            <Icon
              aria-hidden="true"
              className={`mt-0.5 shrink-0 ${notification.isRead ? 'text-gray-500' : 'text-[#D2045B]'}`}
              size={18}
            />
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm truncate ${notification.isRead ? 'text-gray-300' : 'font-semibold text-white'}`}
              >
                {notification.title}
              </span>
              <span className="block text-xs text-gray-400 line-clamp-2">
                {notification.message}
              </span>
              <time
                className="block text-[11px] text-gray-500 mt-1"
                dateTime={notification.createdAt}
              >
                {formatRelativeTime(notification.createdAt)}
              </time>
            </span>
            {!notification.isRead && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#D2045B]">
                <span className="sr-only">Unread</span>
              </span>
            )}
          </>
        );
        const className = `flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:bg-white/10 ${
          notification.isRead ? '' : 'bg-[#D2045B]/5'
        }`;

        return (
          <li key={notification.id}>
            {href ? (
              <Link className={className} href={href} onClick={() => onSelect(notification)}>
                {content}
              </Link>
            ) : (
              <button className={className} type="button" onClick={() => onSelect(notification)}>
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default NotificationList;
