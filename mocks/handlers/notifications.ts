import { http, HttpResponse } from 'msw';
import { mockNotificationsFixture } from '../fixtures/notifications';
import { errorResponse, paginate, readPage } from './response';

/** AudioBlock_Backend `src/routes/notificationRoutes.ts` (Issue #79). */
export const notificationsHandlers = [
  http.get('*/api/notifications', ({ request }) =>
    HttpResponse.json({
      success: true,
      ...paginate(mockNotificationsFixture, readPage(request)),
      unreadCount: mockNotificationsFixture.filter((n) => !n.isRead).length,
    })
  ),

  http.put('*/api/notifications/:id/read', ({ params }) => {
    const notification = mockNotificationsFixture.find((n) => n.id === params.id);
    if (!notification) return errorResponse(404, 'Notification not found', 'NOT_FOUND');
    return HttpResponse.json({ success: true, data: { ...notification, isRead: true } });
  }),

  http.post('*/api/notifications/read-all', () =>
    HttpResponse.json({
      success: true,
      updated: mockNotificationsFixture.filter((n) => !n.isRead).length,
    })
  ),
];
