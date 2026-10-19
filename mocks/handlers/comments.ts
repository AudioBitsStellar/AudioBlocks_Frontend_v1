import { http, HttpResponse } from 'msw';
import { mockCommentsFixture } from '../fixtures/comments';
import { mockOwnProfileFixture } from '../fixtures/users';
import { errorResponse, readPage } from './response';

/**
 * AudioBlock_Backend `src/routes/songEngagementRoutes.ts`, mounted at
 * `/api/songs` (Issue #90). Unlike most routes these bodies have no
 * `success`/`data` envelope.
 */
export const commentsHandlers = [
  http.get('*/api/songs/:id/comments', ({ params, request }) => {
    const { page, limit } = readPage(request);
    const comments = mockCommentsFixture.filter((c) => c.songId === params.id && !c.parentId);
    return HttpResponse.json({
      comments: comments.slice((page - 1) * limit, page * limit),
      total: comments.length,
      page,
      limit,
      totalPages: Math.ceil(comments.length / limit),
    });
  }),

  http.post('*/api/songs/:id/comments', async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.text !== 'string' || !body.text.trim()) {
      return errorResponse(400, 'text must not be empty', 'VALIDATION_FAILED');
    }
    const now = new Date().toISOString();
    const comment = {
      id: crypto.randomUUID(),
      songId: params.id as string,
      userId: mockOwnProfileFixture.id,
      text: body.text,
      parentId: typeof body.parentId === 'string' ? body.parentId : null,
      depth: typeof body.parentId === 'string' ? 1 : 0,
      edited: false,
      replyCount: 0,
      author: {
        id: mockOwnProfileFixture.id,
        username: mockOwnProfileFixture.username,
        name: mockOwnProfileFixture.name,
        profileImage: mockOwnProfileFixture.profileImage,
      },
      createdAt: now,
      updatedAt: now,
    };
    return HttpResponse.json({ message: 'Comment created successfully', comment }, { status: 201 });
  }),
];
