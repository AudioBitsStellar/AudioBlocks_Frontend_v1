import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/constants';
import {
  getEventListings,
  getExploreArtists,
  getExploreCategories,
  getExploreCollections,
  getMerchListings,
  searchContent,
} from '@/lib/exploreService';
import { ApiShapeError } from '@/lib/api/unwrap';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const mockGet = vi.mocked(apiClient.get);

const listingCases = [
  { name: 'getMerchListings', fn: getMerchListings, endpoint: API_ENDPOINTS.MERCH },
  { name: 'getEventListings', fn: getEventListings, endpoint: API_ENDPOINTS.EVENTS },
  {
    name: 'getExploreCategories',
    fn: getExploreCategories,
    endpoint: API_ENDPOINTS.EXPLORE_CATEGORIES,
  },
  {
    name: 'getExploreCollections',
    fn: getExploreCollections,
    endpoint: API_ENDPOINTS.EXPLORE_COLLECTIONS,
  },
  { name: 'getExploreArtists', fn: getExploreArtists, endpoint: API_ENDPOINTS.EXPLORE_ARTISTS },
];

describe('exploreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.each(listingCases)('$name', ({ fn, endpoint }) => {
    it('requests the matching endpoint', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [] } } as never);

      await fn();

      expect(mockGet).toHaveBeenCalledWith(endpoint);
    });

    it('unwraps the `data` envelope', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [{ id: '1' }] } } as never);

      await expect(fn()).resolves.toEqual([{ id: '1' }]);
    });

    // #564: a body without the envelope is a contract problem, not an empty list.
    it('rejects a bare array response with ApiShapeError', async () => {
      mockGet.mockResolvedValueOnce({ data: [{ id: '2' }] } as never);

      await expect(fn()).rejects.toBeInstanceOf(ApiShapeError);
    });

    it('rejects an empty body with ApiShapeError instead of returning []', async () => {
      mockGet.mockResolvedValueOnce({ data: null } as never);

      await expect(fn()).rejects.toBeInstanceOf(ApiShapeError);
    });

    it('propagates request errors instead of returning an empty list', async () => {
      mockGet.mockRejectedValueOnce(new Error('boom'));

      await expect(fn()).rejects.toThrow('boom');
    });
  });

  describe('searchContent', () => {
    it('returns no results and skips the request for queries shorter than 3 characters', async () => {
      await expect(searchContent('')).resolves.toEqual([]);
      await expect(searchContent('wi')).resolves.toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('matches titles and subtitles case-insensitively', async () => {
      const results = await searchContent('WIFFI');

      expect(results.map((r) => r.id)).toEqual(['t1', 'a1', 'c1']);
    });

    it('returns only the matching result types', async () => {
      const results = await searchContent('mchivir');

      expect(results.map((r) => r.type)).toEqual(['track', 'artist']);
    });

    it('returns an empty list when nothing matches', async () => {
      await expect(searchContent('zzzz')).resolves.toEqual([]);
    });
  });
});
