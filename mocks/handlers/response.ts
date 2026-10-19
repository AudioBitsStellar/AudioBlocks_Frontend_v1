import { HttpResponse } from 'msw';

/** Mirrors the backend's page/limit parsing: page >= 1, limit defaults to 20, capped at 100. */
export function readPage(request: Request): { page: number; limit: number } {
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(params.get('page') ?? '', 10) || 1);
  const limit = Math.min(parseInt(params.get('limit') ?? '', 10) || 20, 100);
  return { page, limit };
}

/** One page of `items` plus the backend's `{ page, limit, total, totalPages }` block. */
export function paginate<T>(items: T[], { page, limit }: { page: number; limit: number }) {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) },
  };
}

/** The backend's AppError envelope (`utils/helpers.ts#handleError`). */
export function errorResponse(
  status: number,
  message: string,
  type: 'NOT_FOUND' | 'VALIDATION_FAILED'
) {
  return HttpResponse.json({ success: false, message, type }, { status });
}
