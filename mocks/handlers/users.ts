import { http, HttpResponse } from 'msw';
import { mockOwnProfileFixture, toPublicProfile } from '../fixtures/users';
import { errorResponse } from './response';

/** Profile fields `PUT /api/users/profile` accepts. */
const EDITABLE_FIELDS = ['name', 'bio', 'website', 'profileImage', 'pageCover'] as const;

async function updatedProfile(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const updates = Object.fromEntries(
    EDITABLE_FIELDS.filter((f) => f in body).map((f) => [f, body[f]])
  );
  return { ...mockOwnProfileFixture, ...updates, updatedAt: new Date().toISOString() };
}

/** AudioBlock_Backend `src/routes/userRoutes.ts`, mounted at `/api/users`. */
export const usersHandlers = [
  http.get('*/api/users/profile', () =>
    HttpResponse.json({ success: true, data: mockOwnProfileFixture })
  ),

  http.put('*/api/users/profile', async ({ request }) =>
    HttpResponse.json({ success: true, data: await updatedProfile(request) })
  ),

  http.get('*/api/users/:id/public', ({ params }) => {
    if (params.id !== mockOwnProfileFixture.id) {
      return errorResponse(404, 'User not found', 'NOT_FOUND');
    }
    return HttpResponse.json({ success: true, data: toPublicProfile(mockOwnProfileFixture) });
  }),

  // The app still calls `API_ENDPOINTS.USER_PROFILE` (`/api/user/profile`), which
  // the backend does not serve; `lib/profileService` reads `{ user }` from it.
  http.get('*/api/user/profile', () => HttpResponse.json({ user: mockOwnProfileFixture })),

  http.put('*/api/user/profile', async ({ request }) =>
    HttpResponse.json({ user: await updatedProfile(request) })
  ),
];
