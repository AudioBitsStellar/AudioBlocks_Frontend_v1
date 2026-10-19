/**
 * One place to read the backend's response envelope (#564).
 *
 * The backend answers with `{ success, data }` or `{ data, pagination }`.
 * Services used to guess with `res.data?.data ?? res.data ?? []`, which turned
 * a wrong endpoint or an error body into an empty list or "data". These
 * helpers accept only the envelope and throw ApiShapeError for anything else,
 * so React Query surfaces it as an error state instead.
 */

/** The parts of an axios-style response these helpers read. */
export interface ApiResponseLike {
  data: unknown;
  status?: number;
  config?: { url?: string };
}

export interface Pagination {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

/** The response body didn't have the expected envelope shape. */
export class ApiShapeError extends Error {
  readonly body: unknown;
  readonly url: string | undefined;

  constructor(reason: string, res: ApiResponseLike) {
    const url = res.config?.url;
    super(`Unexpected API response${url ? ` from ${url}` : ''}: ${reason}`);
    this.name = 'ApiShapeError';
    this.body = res.data;
    this.url = url;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function envelope(res: ApiResponseLike): Record<string, unknown> {
  const body = res.data;
  if (!isRecord(body)) {
    const got = Array.isArray(body) ? 'an array' : String(body);
    throw new ApiShapeError(`expected an object envelope, got ${got}`, res);
  }
  if (body.success === false) {
    const message = typeof body.message === 'string' ? body.message : 'success: false';
    throw new ApiShapeError(message, res);
  }
  if (!('data' in body)) {
    throw new ApiShapeError('missing "data" field', res);
  }
  return body;
}

/** Returns `res.data.data` from a `{ success, data }` envelope. */
export function unwrap<T>(res: ApiResponseLike): T {
  return envelope(res).data as T;
}

/** Like `unwrap`, but the payload must be an array. */
export function unwrapList<T>(res: ApiResponseLike): T[] {
  const data = unwrap<unknown>(res);
  if (!Array.isArray(data)) throw new ApiShapeError('expected "data" to be an array', res);
  return data as T[];
}

/** Returns `{ items, pagination }` from a `{ data: [...], pagination }` envelope. */
export function unwrapPaginated<T>(res: ApiResponseLike): { items: T[]; pagination: Pagination } {
  const items = unwrapList<T>(res);
  const pagination = (res.data as Record<string, unknown>).pagination;
  if (!isRecord(pagination)) throw new ApiShapeError('missing "pagination" object', res);
  return { items, pagination: pagination as Pagination };
}
