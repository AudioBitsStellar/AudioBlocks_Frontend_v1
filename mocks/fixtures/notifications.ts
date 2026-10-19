import { mockOwnProfileFixture } from './users';

/** Notification rows (AudioBlock_Backend `src/entities/Notification.ts`). */
export interface MockNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export const mockNotificationsFixture: MockNotification[] = [
  {
    id: '8f4c6a70-0000-4000-8000-000000000001',
    userId: mockOwnProfileFixture.id,
    type: 'marketplace_sale',
    title: 'Purchase completed',
    message: 'Your marketplace purchase was completed successfully.',
    data: { txHash: 'b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020' },
    isRead: false,
    createdAt: '2025-03-15T10:30:00.000Z',
    updatedAt: '2025-03-15T10:30:00.000Z',
  },
  {
    id: '8f4c6a70-0000-4000-8000-000000000002',
    userId: mockOwnProfileFixture.id,
    type: 'new_release',
    title: 'New release',
    message: 'Rozé released "Sunset Horizon".',
    data: { songId: '0b6e7c40-0000-4000-8000-000000000003' },
    isRead: true,
    createdAt: '2025-03-18T18:45:00.000Z',
    updatedAt: '2025-03-18T19:00:00.000Z',
  },
];
