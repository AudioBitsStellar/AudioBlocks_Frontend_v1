import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, afterEach } from 'vitest';
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
import {
  mockEventsFixture,
  mockExploreArtistsFixture,
  mockExploreCategoriesFixture,
  mockExploreCollectionsFixture,
  mockMerchFixture,
} from '@/mocks/fixtures/explore';
import { server } from '@/mocks/server';

const listingCases = [
  {
    name: 'getMerchListings',
    fn: getMerchListings,
    endpoint: API_ENDPOINTS.MERCH,
    fixture: mockMerchFixture,
  },
  {
    name: 'getEventListings',
    fn: getEventListings,
    endpoint: API_ENDPOINTS.EVENTS,
    fixture: mockEventsFixture,
  },
  {
    name: 'getExploreCategories',
    fn: getExploreCategories,
    endpoint: API_ENDPOINTS.EXPLORE_CATEGORIES,
    fixture: mockExploreCategoriesFixture,
  },
  {
    name: 'getExploreCollections',
    fn: getExploreCollections,
    endpoint: API_ENDPOINTS.EXPLORE_COLLECTIONS,
    fixture: mockExploreCollectionsFixture,
  },
  {
    name: 'getExploreArtists',
    fn: getExploreArtists,
    endpoint: API_ENDPOINTS.EXPLORE_ARTISTS,
    fixture: mockExploreArtistsFixture,
  },
];

describe('exploreService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(listingCases)('$name', ({ fn, endpoint, fixture }) => {
    it('requests the matching endpoint and unwraps the `data` envelope', async () => {
      await expect(fn()).resolves.toEqual(fixture);
    });

    it('accepts a bare array response', async () => {
      server.use(http.get(`*${endpoint}`, () => HttpResponse.json([{ id: '2' }])));

      await expect(fn()).rejects.toBeInstanceOf(ApiShapeError);
    });

    it('falls back to an empty list when the body is empty', async () => {
      server.use(http.get(`*${endpoint}`, () => HttpResponse.json(null)));

      await expect(fn()).rejects.toBeInstanceOf(ApiShapeError);
    });

    it('propagates request errors instead of returning an empty list', async () => {
      server.use(http.get(`*${endpoint}`, () => new HttpResponse(null, { status: 404 })));

      await expect(fn()).rejects.toThrow();
    });
  });

  describe('searchContent', () => {
    it('returns no results and skips the request for queries shorter than 3 characters', async () => {
      const getSpy = vi.spyOn(apiClient, 'get');

      await expect(searchContent('')).resolves.toEqual([]);
      await expect(searchContent('wi')).resolves.toEqual([]);
      expect(getSpy).not.toHaveBeenCalled();
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
