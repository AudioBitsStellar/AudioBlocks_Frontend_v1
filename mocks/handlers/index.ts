import { albumsHandlers } from './albums';
import { commentsHandlers } from './comments';
import { communityHandlers } from './community';
import { exploreHandlers } from './explore';
import { genresHandlers } from './genres';
import { marketplaceHandlers } from './marketplace';
import { notificationsHandlers } from './notifications';
import { playlistsHandlers } from './playlists';
import { songsHandlers } from './songs';
import { usersHandlers } from './users';

/**
 * Shared by the browser worker (`mocks/browser.ts`), Vitest (`mocks/server.ts`)
 * and Playwright (`tests/e2e/fixtures/network.ts`). Handlers return fixtures
 * shaped like AudioBlock_Backend responses; override per test with `use()`.
 */
export const handlers = [
  ...songsHandlers,
  ...genresHandlers,
  ...albumsHandlers,
  ...usersHandlers,
  ...playlistsHandlers,
  ...notificationsHandlers,
  ...commentsHandlers,
  ...marketplaceHandlers,
  ...communityHandlers,
  ...exploreHandlers,
];
