import { http, HttpResponse } from 'msw';
import {
  mockEventsFixture,
  mockExploreArtistsFixture,
  mockExploreCategoriesFixture,
  mockExploreCollectionsFixture,
  mockMerchFixture,
} from '../fixtures/explore';

/** App-defined endpoints (`API_ENDPOINTS.MERCH`, `EVENTS`, `EXPLORE_*`); not served by AudioBlock_Backend yet. */
const ROUTES = {
  '*/api/merch': mockMerchFixture,
  '*/api/events': mockEventsFixture,
  '*/api/explore/categories': mockExploreCategoriesFixture,
  '*/api/explore/collections': mockExploreCollectionsFixture,
  '*/api/explore/artists': mockExploreArtistsFixture,
};

export const exploreHandlers = Object.entries(ROUTES).map(([path, data]) =>
  http.get(path, () => HttpResponse.json({ success: true, data }))
);
