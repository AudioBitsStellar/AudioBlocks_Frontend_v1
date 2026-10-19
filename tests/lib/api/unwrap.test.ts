import { describe, it, expect } from 'vitest';
import { ApiShapeError, unwrap, unwrapList, unwrapPaginated } from '@/lib/api/unwrap';

const res = (data: unknown) => ({ data, config: { url: '/api/x' } });

describe('unwrap (#564)', () => {
  it('returns data from a { success, data } envelope', () => {
    expect(unwrap(res({ success: true, data: { id: 1 } }))).toEqual({ id: 1 });
    expect(unwrap(res({ data: null }))).toBeNull();
  });

  it.each([
    ['a bare array', [1, 2]],
    ['a bare object without data', { id: 1 }],
    ['null', null],
    ['a string', 'oops'],
  ])('throws ApiShapeError for %s', (_label, body) => {
    expect(() => unwrap(res(body))).toThrow(ApiShapeError);
  });

  it('throws with the server message when success is false', () => {
    expect(() => unwrap(res({ success: false, message: 'Not allowed', data: null }))).toThrow(
      /Not allowed/
    );
  });

  it('includes the request url and keeps the raw body', () => {
    try {
      unwrap(res([1]));
    } catch (e) {
      expect(e).toBeInstanceOf(ApiShapeError);
      expect((e as ApiShapeError).message).toContain('/api/x');
      expect((e as ApiShapeError).body).toEqual([1]);
    }
  });
});

describe('unwrapList (#564)', () => {
  it('returns the array payload', () => {
    expect(unwrapList(res({ success: true, data: [{ id: 1 }] }))).toEqual([{ id: 1 }]);
  });

  it('throws when data is not an array', () => {
    expect(() => unwrapList(res({ data: { id: 1 } }))).toThrow(ApiShapeError);
  });
});

describe('unwrapPaginated (#564)', () => {
  it('returns items and pagination', () => {
    const pagination = { page: 1, total: 3 };
    expect(unwrapPaginated(res({ data: [1, 2, 3], pagination }))).toEqual({
      items: [1, 2, 3],
      pagination,
    });
  });

  it('throws when pagination is missing', () => {
    expect(() => unwrapPaginated(res({ data: [] }))).toThrow(ApiShapeError);
  });
});
