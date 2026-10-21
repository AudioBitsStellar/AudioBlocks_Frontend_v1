import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ANNOUNCEMENT_EVENT } from '@/hooks/useAnnounce';
import { listNotifications, markNotificationRead } from '@/lib/notificationService';
import type { AppNotification } from '@/lib/notificationService';

vi.mock('@/hooks/useHasAuthSession', () => ({ useHasAuthSession: () => true }));

vi.mock('@/lib/notificationService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notificationService')>();
  return {
    ...actual,
    listNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, className }: React.ComponentProps<'a'>) => (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

const songReply: AppNotification = {
  id: 'n1',
  type: 'comment',
  title: 'New reply',
  message: 'Someone replied to your comment',
  data: { songId: 's1' },
  isRead: false,
  createdAt: new Date().toISOString(),
};
const sale: AppNotification = {
  ...songReply,
  id: 'n2',
  type: 'marketplace_sale',
  title: 'Sale complete',
  data: { txHash: 'abc' },
  isRead: true,
};

function renderBell() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <NotificationBell />
    </QueryClientProvider>
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listNotifications).mockResolvedValue({
      notifications: [songReply, sale],
      unreadCount: 3,
      page: 1,
      totalPages: 1,
    });
    vi.mocked(markNotificationRead).mockReturnValue(new Promise(() => {}));
  });

  it('shows the backend unread count on the badge and in the accessible name', async () => {
    renderBell();

    const bell = await screen.findByRole('button', {
      name: 'Notifications, 3 unread notifications',
    });
    expect(bell).toHaveTextContent('3');
  });

  it('deep-links each notification to its target', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByRole('button', { name: /Notifications, 3 unread/ }));

    expect(screen.getByRole('link', { name: /New reply/ })).toHaveAttribute(
      'href',
      '/embed/song/s1'
    );
    expect(screen.getByRole('link', { name: /Sale complete/ })).toHaveAttribute(
      'href',
      '/dashboard/transactions'
    );
  });

  it('marks an unread notification read and drops the badge immediately', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByRole('button', { name: /Notifications, 3 unread/ }));
    fireEvent.click(screen.getByRole('link', { name: /New reply/ }));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith('n1'));
    expect(
      await screen.findByRole('button', { name: 'Notifications, 2 unread notifications' })
    ).toBeInTheDocument();
  });

  it('announces when the unread count increases', async () => {
    const announcements: string[] = [];
    const listener = (event: Event) =>
      announcements.push((event as CustomEvent<{ message: string }>).detail.message);
    window.addEventListener(ANNOUNCEMENT_EVENT, listener);

    vi.mocked(listNotifications)
      .mockResolvedValueOnce({ notifications: [], unreadCount: 1, page: 1, totalPages: 1 })
      .mockResolvedValue({ notifications: [], unreadCount: 2, page: 1, totalPages: 1 });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <NotificationBell />
      </QueryClientProvider>
    );

    await screen.findByRole('button', { name: /1 unread notification$/ });
    await client.refetchQueries();

    await waitFor(() => expect(announcements).toEqual(['You have 2 unread notifications']));
    window.removeEventListener(ANNOUNCEMENT_EVENT, listener);
  });
});
